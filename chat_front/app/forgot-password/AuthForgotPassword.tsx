import { Alert, AlertTitle, Box, Button, CircularProgress, Grid, Snackbar, Stack, TextField, Typography } from "@mui/material";
import Link from "next/link";
import '@mdi/font/css/materialdesignicons.min.css';
import CustomTextField from "@/app/ui/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/ui/components/forms/theme-elements/CustomFormLabel";
import { useState, useRef } from "react";
import {z} from 'zod'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from "axios";
import './style.css'
import { useRouter } from "next/navigation";
import BaseCard from "../ui/components/BaseCard";

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
  }

const FormSchema = z.object({
    email: z.string()
            .min(1, { message: 'Enter your email address' })
});

type ValidationErrors = {
    email?: string;
};

type PasswordChangeValidationErrors = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string
}

const PasswordChangeSchema = z.object({
    newPassword: z.string()
        .min(8, { message: 'New Password must be at least 8 characters long' })
        .regex(/[A-Z]/, { message: 'New Password must contain at least one uppercase letter' })
        .regex(/[0-9]/, { message: 'New Password must contain at least one digit' })
        .regex(/[@$!%*?&#]/, { message: 'New Password must contain at least one special character' }),
    confirmPassword: z.string().min(1, { message: 'Please Confirm your password' })
});

export default function AuthForgotPassword(){

 const [email, setEmail] = useState('')
 const [isLoading, setIsLoading] = useState(false)
 const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
 const [error, setError] = useState('');
 const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));
 const [showPasswordResetForm, setShowPasswordResetForm] = useState(false)
 const [isPromptVerification, setIsPromptVerification] = useState(false);
 const [snackbarOpen, setSnackbarOpen] = useState(false)
 const [snackbarMessage, setSnackbarMessage] = useState('')
 const [newPassword, setNewPassword] = useState('')
 const [confirmPassword, setConfirmPassword] = useState('')
 const [passwordChangeValidationErrors, setPasswordChangeValidationErrors] = useState<PasswordChangeValidationErrors>({})
 const [openSuccessSnackbar, setOpenSuccessSnackbar] = useState(false)
 const router = useRouter();
 const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
    }
    else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]); // Array of input refs for auto-focus

    const handleVerificationCodeChange = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return; // Only allow numeric input
        const newCode = [...verificationCode];
        newCode[index] = value;
        setVerificationCode(newCode);

        // Automatically move to the next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleVerificationCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && verificationCode[index] === '') {
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };
 
 const handleForgotPassword = async(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("form submitted")
        setError('');
        setIsLoading(true); // Start loader when login is initiated
        try {
            const validatedFields = FormSchema.parse({
                email: email,
            });
            const device_fingerprint = await getClientFingerprint();

            const formData = new FormData();
            formData.append('email', email);
            formData.append('device_fingerprint', device_fingerprint)


            const response = await axios.post(
                `${apiUrl}/auth/forgot-password`,
                formData,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true,
                }
            );

            if (response.status === 200) {
                console.log(response.data)
                if (response.data.hasOwnProperty('success')){
                    setIsPromptVerification(true);
                    setValidationErrors({})
                }
                else{
                    setError('Something went wrong!');
                }
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: {[key: string]: string} = {};
                error.errors.forEach((err) => {
                    fieldErrors[err.path[0]] = err.message;
                });
                setValidationErrors(fieldErrors);
            } else {
                setError('Something went wrong!');
                setValidationErrors({})
            }
        } finally {
            setIsLoading(false); // Stop loader when the API call finishes
        }
    };
    const handleForgotPasswordCodeSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('')
        setIsLoading(true)
        const fullCode = verificationCode.join('');

        try {
            const device_fingerprint = await getClientFingerprint();
            const formData = new FormData();
            formData.append('email', email);
            formData.append('verification_code', fullCode);
            formData.append('device_fingerprint', device_fingerprint)

            const response = await axios.post(
                `${apiUrl}/auth/forgot-password-verify-code`,
                formData,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true,
                }
            );

            if (response.status === 200) {
                setShowPasswordResetForm(true) // Login successful, store user data
            }
        } catch (error: any) {
            let response_text = error.response.data.detail
            if (response_text === "Incorrect OTP Code") {
                setSnackbarMessage("Incorrect OTP Code! Please try again")
                setSnackbarOpen(true)
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
            else if(response_text === "Session expired") {
                setSnackbarMessage("Session expired! Please try again")
                setSnackbarOpen(true)
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
            else if(response_text === "No verification code found for this user") {
                setSnackbarMessage("Attempt failed! Please try again")
                setSnackbarOpen(true)
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
            else if(response_text === "User not found") {
                setSnackbarMessage("Attempt failed! Please try again")
                setSnackbarOpen(true)
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
            else if(response_text === "Verification code has expired") {
                setSnackbarMessage("Code Expired! Please try again")
                setSnackbarOpen(true)
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
            else{
                setError('Something went wrong!');
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
        } finally {
            // setIsLoading(false);
        }
    }

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('Text').trim();
    
        if (/^\d{6}$/.test(pasted)) {
            const digits = pasted.split('');
            setVerificationCode(digits);
    
            // Focus the last input
            inputRefs.current[5]?.focus();
        }
    };

    const handleSubmit = async(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordChangeValidationErrors({})
        setIsLoading(true)
        
        const formData = new FormData(event.currentTarget);

        try {
            PasswordChangeSchema.parse({
                newPassword: newPassword,
                confirmPassword: confirmPassword
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: { [key: string]: string } = {};
                error.errors.forEach((err) => {
                fieldErrors[err.path[0]] = err.message;
                });
                console.log(fieldErrors)
                setPasswordChangeValidationErrors(fieldErrors)
                return;
            }
        }
        finally{
            setIsLoading(false)
        }
        if (newPassword !== confirmPassword) {
            console.log("here")
            setPasswordChangeValidationErrors({
                confirmPassword: "Passwords do not match!"
            });
            setIsLoading(false);
            return;
        }

        const form_data = {
            email: email,
            new_password: newPassword,
        };

        // console.log(form_data);
        try {
            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/reset_password/`, form_data, { withCredentials: true,
                headers: {
                    'X-device_fingerprint': device_fingerprint
                }
            });
            console.log("password change success")
            setOpenSuccessSnackbar(true); // Open success notification
            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
            setTimeout(() => {
                setIsLoading(false); // Stop loading
                router.push("/login"); // Redirect after success
            },  2000); // Delay before redirecting to login
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if(error.response && error.response.status === 404){
                    setError('Something went wrong!');
                    setTimeout(() => {
                        setIsLoading(false); // Stop loading
                        router.push("/login"); // Redirect after success
                    },  2000);
                }
                else{
                    setError('Something went wrong!');
                    setTimeout(() => {
                        setIsLoading(false); // Stop loading
                        router.push("/login"); // Redirect after success
                    },  2000);
                    } 
            } else {
                setError('Something went wrong!');
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000);
            }
        }
        finally{
            setIsLoading(false)
        }
    }
 return (
  <>
    {error && <div className="a-box-inner a-alert-container">
                <i className="mdi mdi-alert"></i>
                <h4 className="a-alert-heading">There was a problem</h4>
                <p className="a-list-item">{error}</p>
            </div>}
    <Typography variant="h4" fontWeight="700">
        Forgot your password?
    </Typography>
    {!showPasswordResetForm && <>
    <Typography color="textSecondary" variant="subtitle2" fontWeight="400" mt={2}>
        Please enter the email address associated with your account and We will email you a verification code
        to reset your password.
    </Typography>
    <Stack mt={4} spacing={2}>
    <form onSubmit={!isPromptVerification ? handleForgotPassword : handleForgotPasswordCodeSubmit}>
        <CustomFormLabel htmlFor="reset-email">Email Address</CustomFormLabel>
        <CustomTextField
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            fullWidth
        />
        {validationErrors.email && <div style={{color: "red"}}>{validationErrors.email}</div>}

        {!isPromptVerification && <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={isLoading}
            sx={{marginTop: "20px"}}
        >
            Forgot Password
        </Button>}
        {isPromptVerification && <Box
    sx={{
        visibility: isPromptVerification ? 'visible' : 'hidden',
        height: isPromptVerification ? 'auto' : 0, // Maintain layout without shifting
        overflow: 'hidden', // Prevent unnecessary space when hidden
        transition: 'visibility 0s, height 0.3s ease-in-out', // Smooth height transition
    }}
>
    <Box mb={4} mt={5}>
        <h6>Last step! To reset your password, enter the code we just sent to your email.</h6>
        <CustomFormLabel htmlFor="verification_code">Verification Code</CustomFormLabel>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '2px' }}>
            {verificationCode.map((digit, index) => (
                <CustomTextField
                    key={index}
                    value={digit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVerificationCodeChange(e.target.value, index)}
                    onKeyDown={(e: any) => handleVerificationCodeKeyDown(e, index)}
                    onPaste={handlePaste}
                    inputProps={{
                        maxLength: 1,
                        style: { textAlign: 'center' }
                    }}
                    inputRef={(el: any) => (inputRefs.current[index] = el)} // Assign ref
                    sx={{ width: '60px' }}
                />
            ))}
        </Box>
    </Box>
    <Box mt={4}>
        <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={isLoading}
        >
            {isLoading ? <CircularProgress size={24} /> : "Submit Code"}
        </Button>
    </Box>
</Box>}
    </form>
    <Button
        color="primary"
        size="large"
        fullWidth
        component={Link}
        href="/auth/auth1/login"
      >
        Back to Login
      </Button>

    </Stack>
    </>}
    <br></br>
    {showPasswordResetForm && <BaseCard title="Change Current Password">
            <form onSubmit={handleSubmit}>
                <Stack spacing={0}>
                    <Grid container spacing={3} justifyContent="center" mt={0}>
                        <Grid item xs={12} md={12}>
                            <TextField
                                id="new-password"
                                name="new-password"
                                value={newPassword}
                                onChange={(e)=>setNewPassword(e.target.value)}
                                type="password"
                                label="Enter New Password"
                                variant="outlined"
                                fullWidth
                            />
                            {passwordChangeValidationErrors.newPassword && <div style={{"color": "red"}}>{passwordChangeValidationErrors.newPassword}</div>}
                        </Grid>
                        <Grid item xs={12} md={12}>
                            <TextField
                                id="confirm-password"
                                name="confirm-password"
                                value={confirmPassword}
                                onChange={(e)=>setConfirmPassword(e.target.value)}
                                type="password"
                                label="Confirm Password"
                                variant="outlined"
                                fullWidth
                            />
                            {passwordChangeValidationErrors.confirmPassword && <div style={{"color": "red"}}>{passwordChangeValidationErrors.confirmPassword}</div>}
                        </Grid>
                    </Grid>
                </Stack>
                <br />
                <Button type="submit" variant='contained'>
                    Change Password
                </Button>
            </form>
        </BaseCard>}
    <Snackbar
        open={snackbarOpen}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={3000}
        onClose={()=>setSnackbarOpen(false)}
    >
        <Alert
        severity="error"
        variant="filled"
        sx={{ width: '100%', color: 'white' }}
        >
        <AlertTitle>Verification Failed</AlertTitle>
            {snackbarMessage}
        </Alert>
    </Snackbar>
    <Snackbar
        open={openSuccessSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={6000}
    >
        <Alert
        severity="success"
        variant="filled"
        sx={{ width: '100%', color: 'white' }}
        >
        <AlertTitle>Password changed successfully</AlertTitle>
            Taking you to the login page!
        </Alert>
    </Snackbar>
  </>
)};
