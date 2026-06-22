import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Typography, Select, MenuItem, FormControl, InputLabel, Alert, Snackbar, AlertTitle } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
import { useUser } from '@/app/context/user-context';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffSharpIcon from '@mui/icons-material/HighlightOffSharp';

interface KYCFile {
    id?: number; // make id optional for new files
    fileName: string;
    file: File | null;
    file_id?: string; // optional file path for existing files
}

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
}

const MAX_FILES = 4;
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MIN_REQUIRED_FILES = 2;

const availableFileOptions = [
    "Aadhaar Card",
    "PAN Card",
    "Passport",
    "Voter ID",
    "Driving License",
    "Address Proof / Utility Bill",
    "Incorporation Certificate",
    "GST Certificate",
];

interface KYCProps {
    canProceed?: boolean;
    setCanProceed?: (value: boolean) => void;
    setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
}

const KYCUpload = ({ canProceed, setCanProceed, setIsLoading }: KYCProps) => {
    const { user, setUser } = useUser();
    const [files, setFiles] = useState<KYCFile[]>([{ fileName: '', file: null }]);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [unsavedFileIndex, setUnsavedFileIndex] = useState<number | null>(null); // Track unsaved file
    const selectedFileNames = files.map(file => file.fileName);
    const [kycSaveLoading, setKYCSaveLoading] = useState(false)
    const kycFinished = user?.organisation?.kyc_finish_timestamp;

    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
    } else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }

    const handleRemoveRow = async(index: number) => {
        if (files[index]["id"]){
            try {
                const device_fingerprint = await getClientFingerprint();
                const response = await axios.get(`${apiUrl}/users/delete_kyc_file?file_id=${files[index]["id"]}`, {
                    withCredentials: true,
                    headers: {
                        'X-device_fingerprint': device_fingerprint,
                        'Content-Type': 'multipart/form-data',
                    },
                });
                setUser(response.data);
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    if (error.response && error.response.status === 401) {
                      try {
                        const device_fingerprint = await getClientFingerprint();
                        await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                        const response = await axios.get(`${apiUrl}/users/delete_kyc_file?file_id=${files[index]["id"]}`, { 
                          withCredentials: true,
                          headers: {
                            'X-device_fingerprint': device_fingerprint
                          }
                        });
                        setUser(response.data)
                      } catch {
                        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                        setUser(null);
                      }
                    } else {
                      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                      setUser(null);
                    }
                  } else {
                    await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                    setUser(null);
                  }
            }
        }
        setUnsavedFileIndex(null)
        setFiles(prevFiles => {
            if (prevFiles.length === 1) {
                // If it's the last row, just reset it
                return [{ fileName: '', file: null }];
            }
            return prevFiles.filter((_, i) => i !== index);
        });
    };

    const getFilteredOptions = (currentFileName: string) => {
        return availableFileOptions.filter(option => option === currentFileName || !selectedFileNames.includes(option));
    };

    useEffect(() => {
        if (user && user.kyc_files && user.kyc_files.length > 0) {
            const initialFiles = user.kyc_files.map(kycFile => ({
                id: kycFile.id,
                fileName: kycFile.file_name,
                file: null,
                file_id: kycFile.file_id,
            }));
            setFiles(initialFiles);
        }
    }, [user]);

    useEffect(() => {
        const validFilesCount = files.filter(file => file.file_id).length;

        if (validFilesCount >= MIN_REQUIRED_FILES && setCanProceed) {
            setCanProceed(true);
        } else if (setCanProceed) {
            setCanProceed(false);
        }
    }, [files, setCanProceed]);

    const handleFileChange = (index: number, file: File | null) => {
        if (file && !ALLOWED_FILE_TYPES.includes(file.type)) {
            setSnackbarMessage('Invalid file type. Only PNG, JPG, and PDF are allowed.');
            setSnackbarOpen(true);
            return;
        }
        if (file && file.size > MAX_FILE_SIZE) {
            setSnackbarMessage('File size exceeds the 3MB limit.');
            setSnackbarOpen(true);
            return;
        }
        const newFiles = [...files];
        newFiles[index].file = file;
        setFiles(newFiles);
        setUnsavedFileIndex(index); // Mark file as unsaved
    };

    const handleFileNameChange = (index: number, fileName: string) => {
        const newFiles = [...files];
        newFiles[index].fileName = fileName;
        setFiles(newFiles);
    };

    const handleAddRow = () => {
        const allFilesSaved = files.every(file => file.file_id);

        if (allFilesSaved && files.length < MAX_FILES) {
            setFiles([...files, { fileName: '', file: null }]);
        } else {
            setSnackbarMessage('Please save all files before adding a new one.');
            setSnackbarOpen(true);
        }
    };

    const handleSave = async (index: number) => {
        setKYCSaveLoading(true)
        const fileData = files[index];
        if (!fileData.fileName || !fileData.file) {
            setSnackbarMessage('Please provide both file name and file before saving.');
            setSnackbarOpen(true);
            setKYCSaveLoading(false)
            return;
        }

        const formData = new FormData();
        formData.append('file_name', fileData.fileName);
        formData.append('file', fileData.file);

        try {
            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/upload_kyc_file/`, formData, {
                withCredentials: true,
                headers: {
                    'X-device_fingerprint': device_fingerprint,
                    'Content-Type': 'multipart/form-data',
                },
            });
            setUser(response.data);
            setUnsavedFileIndex(null); // Clear unsaved status
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 401) {
                  try {
                    const device_fingerprint = await getClientFingerprint();
                    await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                    const response = await axios.post(`${apiUrl}/users/upload_kyc_file/`, formData, {
                        withCredentials: true,
                        headers: {
                            'X-device_fingerprint': device_fingerprint,
                            'Content-Type': 'multipart/form-data',
                        },
                    });
                    setUser(response.data);
                    setUnsavedFileIndex(null); // Clear unsaved status
                  } catch {
                    await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                    setUser(null);
                  }
                } else {
                  await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                  setUser(null);
                }
              } else {
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
              }
        }
        finally{
            setKYCSaveLoading(false)
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>KYC File Upload</Typography>
            <br />
            {files.length < MIN_REQUIRED_FILES && (
                <Alert severity="info" sx={{ mb: 2, color: 'black' }}>
                    You need to upload at least {MIN_REQUIRED_FILES} files.
                </Alert>
            )}
            {files.map((fileData, index) => (
                <Box key={index} display="flex" alignItems="center" mb={2}>
                    <FormControl variant="outlined" sx={{ mr: 4, minWidth: 300 }}>
                        <InputLabel id={`file-name-label-${index}`}>File Name</InputLabel>
                        <Select
                            labelId={`file-name-label-${index}`}
                            value={fileData.fileName}
                            onChange={(e) => handleFileNameChange(index, e.target.value as string)}
                            label="File Name"
                            disabled={!!fileData.file_id || !!kycFinished}
                        >
                            {getFilteredOptions(fileData.fileName).map(option => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        component="label"
                        sx={{ mr: 4 }}
                        disabled={!!fileData.file_id || !!kycFinished}
                    >
                        Browse
                        <input
                            type="file"
                            hidden
                            onChange={(e) => handleFileChange(index, e.target.files ? e.target.files[0] : null)}
                        />
                    </Button>
                    <Box sx={{ width: '200px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                        {fileData.file && (
                            <Typography variant="body1" sx={{ mr: 5 }}>
                                {fileData.file.name}
                            </Typography>
                        )}
                        {!fileData.file && fileData.file_id && (
                            <Box display="flex" alignItems="center" sx={{ mr: 5 }}>
                                <CheckCircleIcon style={{ color: 'green', marginRight: 4 }} />
                                <Typography variant="body1">uploaded</Typography>
                            </Box>
                        )}
                    </Box>
                    <IconButton
                        color="primary"
                        onClick={() => handleSave(index)}
                        sx={{ mr: 1 }}
                        disabled={!!fileData.file_id || !!kycFinished || kycSaveLoading}
                    >
                        <SaveIcon sx={{ fontSize: '35px' }} />
                    </IconButton>
                    {index === files.length - 1 && files.length < MAX_FILES && !kycFinished && (
                        <IconButton color="primary" onClick={handleAddRow}>
                            <AddCircleOutlineIcon />
                        </IconButton>
                    )}
                    {!kycFinished && (
                        <IconButton color="error" onClick={() => handleRemoveRow(index)} sx={{ ml: 'auto' }}>
                            <HighlightOffSharpIcon></HighlightOffSharpIcon>
                        </IconButton>
                    )}
                </Box>
            ))}
            {/* Notify user to save the file if a file is selected but not yet saved */}
            {unsavedFileIndex !== null && (
                <Typography variant="body2" color="error">
                    Please save the selected file.
                </Typography>
            )}
            <Snackbar
                open={snackbarOpen}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                autoHideDuration={6000}
                onClose={()=>setSnackbarOpen(false)}
            >
                <Alert
                severity="error"
                variant="filled"
                sx={{ width: '100%', color: 'white' }}
                >
                <AlertTitle>KYC upload</AlertTitle>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default KYCUpload;