'use client'
import React from 'react'
import BaseCard from '@/app/ui/components/BaseCard';
import {
    Paper,
    Grid,
    Stack,
    TextField,
    FormControlLabel,
    RadioGroup,
    Radio,
    FormLabel,
    FormControl,
    Button,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,

  } from '@mui/material';
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useState } from 'react';
import {z} from 'zod'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
import { useUser } from '@/app/context/user-context';

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
}

const PasswordChangeSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Current Password must not be empty' }),
    newPassword: z.string()
        .min(8, { message: 'New Password must be at least 8 characters long' })
        .regex(/[A-Z]/, { message: 'New Password must contain at least one uppercase letter' })
        .regex(/[0-9]/, { message: 'New Password must contain at least one digit' })
        .regex(/[@$!%*?&#]/, { message: 'New Password must contain at least one special character' }),
    confirmPassword: z.string().min(1, { message: 'Please Confirm your password' })
});

type PasswordChangeValidationErrors = {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string
}

const ChangePasswordBox = () => {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [buttonStatus, setButtonStatus] = useState<'default' | 'loading' | 'success'>('default');
    const [passwordChangeValidationErrors, setPasswordChangeValidationErrors] = useState<PasswordChangeValidationErrors>({})
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const togglePasswordVisibility = (field: string) => {
        if (field === "current") setShowCurrentPassword((prev) => !prev);
        if (field === "new") setShowNewPassword((prev) => !prev);
        if (field === "confirm") setShowConfirmPassword((prev) => !prev);
    };
    const {user, setUser} = useUser()
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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setButtonStatus('loading')
        setPasswordChangeValidationErrors({})

        try {
            PasswordChangeSchema.parse({
                currentPassword: currentPassword,
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
                setButtonStatus('default')
                return;
            }
        }
        if (newPassword != confirmPassword){
            const fieldErrors: { [key: string]: string } = {};
            fieldErrors['confirmPassword'] = 'New Password and Confirm Password fields must match';
            setPasswordChangeValidationErrors(fieldErrors)
            setButtonStatus('default')
            return;
        }

        const form_data = {
            current_password: currentPassword,
            new_password: newPassword,
        };

        // console.log(form_data);
        try {
            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/change_password/`, form_data, { withCredentials: true,
                headers: {
                    'X-device_fingerprint': device_fingerprint
                }
            });
            setButtonStatus('success');
            // Keep the success state for a short duration, then reset back to default
            setTimeout(() => {
                setButtonStatus('default');
            }, 3000); // Show success state for 3 seconds
            console.log("password change success")
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 401) {
                    // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                    try {
                        const device_fingerprint = await getClientFingerprint();
                        await axios.post('${apiUrl}/auth/refresh_access_token', { device_fingerprint: device_fingerprint }, { withCredentials: true });
                        const response = await axios.post(`${apiUrl}/users/change_password/`, form_data, { withCredentials: true,
                        headers: {
                            'X-device_fingerprint': device_fingerprint
                        }
                        });
                        setButtonStatus('success');
                        // Keep the success state for a short duration, then reset back to default
                        setTimeout(() => {
                            setButtonStatus('default');
                        }, 3000); // Show success state for 3 seconds
                        console.log("password changed success")
                    } catch (error: unknown) {
                        if (axios.isAxiosError(error)){
                            if (error.response && error.response.status === 401){
                                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                                setUser(null);
                            }
                            else if (error.response && error.response.status === 400){
                                setPasswordChangeValidationErrors({currentPassword: error.response.data.detail})
                                setCurrentPassword('')
                            }
                            else{
                                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                                setUser(null)
                            }
                        }
                        else{
                            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                            setUser(null);
                        }
                        
                    }
                }
                else if(error.response && error.response.status === 400){
                    setPasswordChangeValidationErrors({currentPassword: error.response.data.detail})
                    setCurrentPassword('')
                    setButtonStatus('default')
                    console.log(error.response)
                }
                else{
                    await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                    setUser(null);
                    } 
            } else {
                console.error('Failed to fetch user:', error);
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
            }
        }
    }

    return (
        <BaseCard title="Change Current Password">
            <form onSubmit={handleSubmit}>
                <Stack spacing={0}>
                    <Grid container spacing={3} justifyContent="center" mt={1}>
                        <Grid item xs={12} md={12}>
                            <TextField
                                id="current-password"
                                name="current-password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                type={showCurrentPassword ? "text" : "password"} // Toggle type
                                label="Current Password"
                                variant="outlined"
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => togglePasswordVisibility("current")} edge="end">
                                                {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {passwordChangeValidationErrors.currentPassword && !currentPassword && <div style={{"color": "red"}}>{passwordChangeValidationErrors.currentPassword}</div>}
                        </Grid>
                        <Grid item xs={12} md={12}>
                            <TextField
                                id="new-password"
                                name="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                type={showNewPassword ? "text" : "password"} // Toggle type
                                label="Enter New Password"
                                variant="outlined"
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => togglePasswordVisibility("new")} edge="end">
                                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {passwordChangeValidationErrors.newPassword && <div style={{"color": "red"}}>{passwordChangeValidationErrors.newPassword}</div>}
                        </Grid>
                        <Grid item xs={12} md={12}>
                            <TextField
                                id="confirm-password"
                                name="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                type={showConfirmPassword ? "text" : "password"} // Toggle type
                                label="Confirm Password"
                                variant="outlined"
                                fullWidth
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => togglePasswordVisibility("confirm")} edge="end">
                                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {passwordChangeValidationErrors.confirmPassword && (!confirmPassword || confirmPassword != newPassword) && <div style={{"color": "red"}}>{passwordChangeValidationErrors.confirmPassword}</div>}
                        </Grid>
                    </Grid>
                </Stack>
                <br />
                <Button
              variant="contained"
              type="submit"
              disabled={buttonStatus === "loading"}
              sx={{
                width: '112.5px',   // 150px * 3/4 = 112.5px
                height: '37.5px',   // 50px * 3/4 = 37.5px
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                fontSize: '13px',    // Adjust font size to 3/4 of original
              }}
            >
              {buttonStatus === "loading" ? (
                <CircularProgress size={18} color="inherit" />  // CircularProgress scaled down to 3/4
              ) : buttonStatus === "success" ? (
                <svg width="30" height="30" viewBox="0 0 40 40">  // SVG scaled to 3/4 of 40px
                  <circle
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    cx="20"
                    cy="20"
                    r="15"
                    className="circle"
                    strokeLinecap="round"
                    transform="rotate(-90 20 20)"
                  />
                  <polyline
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    points="12,20 15,25 28,15"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="tick"
                  />
                </svg>
              ) : (
                "Update"
              )}

              <style>
                {`
                  .circle {
                    stroke-dasharray: 94;
                    stroke-dashoffset: 94;
                  }
                  svg .circle {
                    animation: circle 1s ease-in-out;
                    animation-fill-mode: forwards;
                  }
                  .tick {
                    stroke-dasharray: 35;
                    stroke-dashoffset: 35;
                  }
                  svg .tick {
                    animation: tick 0.8s ease-out;
                    animation-fill-mode: forwards;
                    animation-delay: 0.95s;
                  }

                  @keyframes circle {
                    from {
                      stroke-dashoffset: 94;
                    }
                    to {
                      stroke-dashoffset: 188;
                    }
                  }

                  @keyframes tick {
                    from {
                      stroke-dashoffset: 35;
                    }
                    to {
                      stroke-dashoffset: 0;
                    }
                  }
                `}
              </style>
          </Button>
            </form>
        </BaseCard>
    )
}

export default ChangePasswordBox
