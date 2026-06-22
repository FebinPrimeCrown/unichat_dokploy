import {
    Box,
    Typography,
    FormGroup,
    FormControlLabel,
    Button,
    Stack,
    Divider,
    CircularProgress,
    Snackbar,
    Alert,
    AlertTitle
} from "@mui/material";
import Link from "next/link";
import { loginType } from "@/app/types/auth/auth";
import CustomCheckbox from "@/app/ui/components/forms/theme-elements/CustomCheckbox";
import CustomTextField from "@/app/ui/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/ui/components/forms/theme-elements/CustomFormLabel";
import AuthSocialButtons from "./AuthSocialButtons";
import {z} from 'zod'
import { useSearchParams } from 'next/navigation';
import { useUser } from '../context/user-context';
import { useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { DetectRefreshToken } from '../utils/actions';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import "./style.css"
import '@mdi/font/css/materialdesignicons.min.css';
import { AxiosError } from "axios";
import { IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
  }

const FormSchema = z.object({
    email: z.string()
            .min(1, { message: 'Enter your email address' }),
    password: z.string().min(1, { message: 'Enter your password' })
});

type ValidationErrors = {
    email?: string;
    password?: string;
};

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Add a state for loading
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const router = useRouter();
    const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));
    const [isPromptVerification, setIsPromptVerification] = useState(false); // State to track verification prompt
    const searchParams = useSearchParams();
    const next_page_url = searchParams.get('next');
    const {user, refetchUser, setUser} = useUser();
    const [resendTimer, setResendTimer] = useState(0); // Timer for "Resend Code"
    const [canResend, setCanResend] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState('')
    const [resendVisible, setResendVisible] = useState(true)
    const [showPassword, setShowPassword] = useState(false);

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

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };
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
    console.log(user?.email)

    console.log("login rendered")

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

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setIsLoading(true); // Start loader when login is initiated
        try {
            const validatedFields = FormSchema.parse({
                email: email,
                password: password
            });
            const device_fingerprint = await getClientFingerprint();

            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            formData.append('device_fingerprint', device_fingerprint);
            formData.append('verification_code', '')

            const response = await axios.post(
                `${apiUrl}/auth/login`,
                formData,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true,
                }
            );

            if (response.status === 200) {
                console.log(response.data)
                
                if (response.data?.prompt_verification_code_input === 1) {
    console.log("✅ Triggering code input...");
    setIsPromptVerification(true);
     startResendTimer();
                    setValidationErrors({})
}
                else{
                    setUser(response.data)
                }
            }
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                const fieldErrors: {[key: string]: string} = {};
                error.errors.forEach((err) => {
                    fieldErrors[err.path[0]] = err.message;
                });
                setValidationErrors(fieldErrors);
            }else if(axios.isAxiosError(error)){
                if (error.response && error.response.status === 401){
                    setError(error.response?.data?.detail)
                    setValidationErrors({})
                }
            } else {
                setError('Invalid email or password');
                setValidationErrors({})
            }
        } finally {
            setIsLoading(false); // Stop loader when the API call finishes
        }
    };

    const handleVerificationCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('')

        const fullCode = verificationCode.join('');
        const device_fingerprint = await getClientFingerprint();

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('verification_code', fullCode);
            formData.append('device_fingerprint', device_fingerprint)

            const response = await axios.post(
                `${apiUrl}/auth/verify-code`,
                formData,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    withCredentials: true,
                }
            );

            if (response.status === 200) {
                setUser(response.data)
            }
        } catch (error: any) {
            let response_text = error.response.data.detail
            if (response_text === "3 invalid attempts") {
                setSnackbarMessage("Max retries exceeded! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else if(response_text === "Session expired") {
                setSnackbarMessage("Session expired! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else if(response_text === "No verification code found for this user") {
                setSnackbarMessage("Attempt failed! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else if(response_text === "User not found") {
                setSnackbarMessage("Attempt failed! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else if(response_text === "Verification code has expired") {
                setSnackbarMessage("Attempt failed! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else{
                setError('Invalid or expired verification code');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setError('')
        try {
            const formData = new FormData();
            formData.append('email', email);

            const response = await axios.post(`${apiUrl}/auth/resend-code`, formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                withCredentials: true,
            });
            if (response.data.hasOwnProperty('last_resend')){
                setResendVisible(false)
            }
            else{
                startResendTimer(); // Restart the resend timer after sending the code
            }
        } catch (error: any) {
            if (error.response.data.detail === "Session expired"){
                setSnackbarMessage("Session expired! Please login again")
                setSnackbarOpen(true)
                setError('')
                setIsPromptVerification(false)
                setEmail('')
                setPassword('')
                setVerificationCode(Array(6).fill(''));
            }
            else{
                setError('Failed to resend verification code');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Start Timer for Resend Code
    const startResendTimer = () => {
        setCanResend(false);
        setResendTimer(30);
    };

    // UseEffect to handle the countdown for "Resend Code"
    useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);

            return () => clearInterval(interval);
        } else {
            setCanResend(true); // Allow resending code when timer hits 0
        }
    }, [resendTimer]);

    return (
        <>
            {error && <div className="a-box-inner a-alert-container">
                <i className="mdi mdi-alert"></i>
                <h4 className="a-alert-heading">There was a problem</h4>
                <p className="a-list-item">{error}</p>
            </div>}

            {title && <Typography fontWeight="700" variant="h3" mb={1}>{title}</Typography>}
            {subtext}

            <Stack>
                <form onSubmit={isPromptVerification ? handleVerificationCodeSubmit : handleLogin}>
                    <Box>
                        <CustomFormLabel htmlFor="email">Email</CustomFormLabel>
                        <CustomTextField
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                            fullWidth
                        />
                        {validationErrors.email && <div style={{color: "red"}}>{validationErrors.email}</div>}
                    </Box>
                    <Box>
                        <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
                        <CustomTextField
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"} // Toggle between text & password
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={togglePasswordVisibility} edge="end">
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        {validationErrors.password && <div style={{color: "red"}}>{validationErrors.password}</div>}
                    </Box>
                    {!isPromptVerification && <Box my={1}>
                    <Typography
                        component={Link}
                        href="/forgot-password"
                        fontWeight="500"
                        sx={{
                            textDecoration: "none",
                            color: "primary.main",
                        }}
                        >
                        Forgot Password ?
                        </Typography>
                    </Box>}
                    {!isPromptVerification && <Box my={4}>
                        <Button
                            color="primary"
                            variant="contained"
                            size="large"
                            fullWidth
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} /> : "Sign In"}
                        </Button>
                    </Box>}
                    {isPromptVerification && <Box
    sx={{
        visibility: isPromptVerification ? 'visible' : 'hidden',
        height: isPromptVerification ? 'auto' : 0, // Maintain layout without shifting
        overflow: 'hidden', // Prevent unnecessary space when hidden
        transition: 'visibility 0s, height 0.3s ease-in-out', // Smooth height transition
    }}
>
    <Box mb={4} mt={5}>
        <h6>We have sent a verification code to your email.</h6>
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
    <Box my={4}>
        {resendVisible && <Button
            onClick={handleResendCode}
            disabled={!canResend || isLoading}
            fullWidth
        >
            {canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
        </Button>}
    </Box>
</Box>}
                    
                </form>
            </Stack>

            {!isPromptVerification &&subtitle}
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
                <AlertTitle>Info</AlertTitle>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

export default AuthLogin;

  