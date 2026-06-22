import { Box, Typography, Button, Divider, CircularProgress, Snackbar, Alert, AlertTitle } from "@mui/material";
import Link from "next/link";
import CustomTextField from "@/app/ui/components/forms/theme-elements/CustomTextField";
import CustomFormLabel from "@/app/ui/components/forms/theme-elements/CustomFormLabel";
import { Stack } from "@mui/system";
import { registerType } from "@/app/types/auth/auth";
import AuthSocialButtons from "./AuthSocialButtons";
import {z} from 'zod'
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import "../login/style.css"
import '@mdi/font/css/materialdesignicons.min.css';

const FormSchema = z.object({
    email: z.string().min(1, { message: 'Enter your email address' }),
    firstname: z.string().min(1, { message: 'Enter your first name' }),
    lastname: z.string().min(1, { message: 'Enter your last name' }),
    password: z.string()
            .min(8, { message: 'Password must be at least 8 characters long' })
            .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
            .regex(/[0-9]/, { message: 'Password must contain at least one digit' })
            .regex(/[@$!%*?&#]/, { message: 'Password must contain at least one special character' }),
});

type ValidationErrors = {
  [key: string]: string | string[] | undefined;
};

const AuthRegister = ({ title, subtitle, subtext }: registerType) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstname, setFirstName] = useState('');
    const [lastname, setLastName] = useState('');
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false); // Loader state
    const [openSnackbar, setOpenSnackbar] = useState(false); // Snackbar state
    const router = useRouter();
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    
    let apiUrl;
    if (environment === 'production') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION;
    } else if (environment === 'staging') {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING;
    } else {
        apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true); // Start loading
        setError('');
        setValidationErrors({});

        try {
            const validatedFields = FormSchema.parse({
                email: email,
                password: password,
                firstname: firstname,
                lastname: lastname
            });

            const roles: string[] = ['group_admin'];
            const form_data = {
                first_name: firstname,
                last_name: lastname,
                email: email,
                password: password,
                roles: roles
            };

            const response = await axios.post(`${apiUrl}/users/`, form_data, {
                withCredentials: true,
            });

            if (response.status === 200) {
                setOpenSnackbar(true); // Open success notification
                setTimeout(() => {
                    setIsLoading(false); // Stop loading
                    router.push("/login"); // Redirect after success
                },  2000); // Delay before redirecting to login
            }
        } catch (error: any) {
            setIsLoading(false); // Stop loading on error
            if (error instanceof z.ZodError) {
                const fieldErrors: ValidationErrors = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as string;
                    if (field === 'password' && !fieldErrors.password) {
                        fieldErrors.password = err.message;
                    } else if (field !== 'password') {
                        fieldErrors[field] = err.message;
                    }
                });
                setValidationErrors(fieldErrors);
            } else {
                setError(error.response?.data?.detail || 'An error occurred');
            }
        }
    };

    return (
        <>
            {/* Error box */}
            {error && <div className="a-box-inner a-alert-container">
                <i className="mdi mdi-alert"></i>
                <h4 className="a-alert-heading">There was a problem</h4>
                <p className="a-list-item">{error}</p>
            </div>}
            {title ? (
                <Typography fontWeight="700" variant="h3" mb={1}>
                    {title}
                </Typography>
            ) : null}

            {subtext}

            <Box>
                <form onSubmit={handleSubmit}>
                    <Stack mb={3}>
                        {/* Form Fields */}
                        <Box>
                            <CustomFormLabel htmlFor="firstname">First Name</CustomFormLabel>
                            <CustomTextField id="firstname" name="firstname" type="text" variant="outlined" value={firstname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} fullWidth />
                            {validationErrors.firstname && !firstname && <div style={{"color": "red"}}>{validationErrors.firstname}</div>}
                        </Box>
                        <Box>
                            <CustomFormLabel htmlFor="lastname">Last Name</CustomFormLabel>
                            <CustomTextField id="lastname" name="lastname" type="text" variant="outlined" value={lastname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} fullWidth />
                            {validationErrors.lastname && !lastname && <div style={{"color": "red"}}>{validationErrors.lastname}</div>}
                        </Box>
                        <Box>
                            <CustomFormLabel htmlFor="email">Email Address</CustomFormLabel>
                            <CustomTextField id="email" name="email" type="email" variant="outlined" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} fullWidth />
                            {validationErrors.email && !email && <div style={{"color": "red"}}>{validationErrors.email}</div>}
                        </Box>
                        <Box>
                            <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
                            <CustomTextField id="password" name="password" type="password" variant="outlined" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} fullWidth />
                            {validationErrors.password && (
                                <div style={{ color: 'red' }}>{validationErrors.password}</div>
                            )}
                        </Box>
                    </Stack>
                    {/* Show loader or signup button */}
                    <Box position="relative">
                        <Button color="primary" variant="contained" size="large" fullWidth type="submit" disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : "Sign Up"}
                        </Button>

                        {/* Snackbar positioned below the signup button */}
                        <Snackbar
                            open={openSnackbar}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            autoHideDuration={6000}
                        >
                            <Alert
                            severity="success"
                            variant="filled"
                            sx={{ width: '100%', color: 'white' }}
                            >
                            <AlertTitle>Welcome To Mypanel</AlertTitle>
                                Registration Successfull! Taking you to the login page!
                            </Alert>
                        </Snackbar>
                    </Box>
                </form>
            </Box>
            {subtitle}


        </>
    );
};

export default AuthRegister;