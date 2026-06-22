import React from 'react';
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
    CircularProgress
  } from '@mui/material';
import BaseCard from '@/app/ui/components/BaseCard';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DetectRefreshToken } from '@/app/utils/actions';
import { useUser } from '@/app/context/user-context';
import '../stylesheets/style.css'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
import {z} from 'zod';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';


interface UserDetailsFormProps {
  onNext: () => void;
  handleBack: () => void;
}

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
}

type UserDetailsValidationErrors = {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string
}

const userDetailsSchema = z.object({
    firstName: z.string()
              .min(1, { message: 'First Name must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'First Name must contain only alphabets' }),
    lastName: z.string().min(1, { message: 'Last Name must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'Last Name must contain only alphabets' }),
    phoneNumber: z.string().min(1, { message: 'Phone number must not be empty' })
});


const UserDetailsForm = ({ onNext, handleBack }: UserDetailsFormProps) => {

    const router = useRouter();
    const { user, setUser } = useUser();
    const [telephoneNumber, setTelephoneNumber] = useState(user?.telephone_number)
    const [firstName, setFirstName] = useState(user?.first_name)
    const [lastName, setLastName] = useState(user?.last_name)
    const [countryDialCode, setCountryDialCode] = useState('+91'); // Default 
    const [userdetailsValidationErrors, setUserDetailsValidationErrors] = useState<UserDetailsValidationErrors>({})
    const [isLoading, setIsLoading] = useState(false)
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
        setIsLoading(true)
        const formData = new FormData(event.currentTarget);

        // Step 1: Remove +countryDialCode and any existing dot after the code
        const sanitizedPhoneNumber = telephoneNumber?.replace(new RegExp(`^\\+?${countryDialCode.replace('+', '')}\\.?`), '') // Remove +countryDialCode and optional dot
        .trim();

        // Step 2: Format the phone number as +91.9746038376
        const formattedPhoneNumber = `${countryDialCode}.${sanitizedPhoneNumber}`;
        if (!sanitizedPhoneNumber){
            const fieldErrors: { [key: string]: string } = {};
            fieldErrors['phoneNumber'] = "Phone number must not be empty"
            console.log(fieldErrors)
            setUserDetailsValidationErrors(fieldErrors)
            setIsLoading(false)
            return;
        }

        try {
            userDetailsSchema.parse({
                firstName: firstName,
                lastName: lastName,
                phoneNumber: formattedPhoneNumber
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                const fieldErrors: { [key: string]: string } = {};
                error.errors.forEach((err) => {
                fieldErrors[err.path[0]] = err.message;
                });
                console.log(fieldErrors)
                setUserDetailsValidationErrors(fieldErrors)
                setIsLoading(false)
                return;
            }
        }

        const form_data = {
            first_name: firstName,
            last_name: lastName,
            telephone_number: formattedPhoneNumber
        };

        console.log(form_data);
        try {
            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/user_update/`, form_data, { withCredentials: true,
                headers: {
                'X-device_fingerprint': device_fingerprint
                }
            });
            setUser(response.data);
            onNext();
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 401) {
                    // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                    try {
                        const device_fingerprint = await getClientFingerprint();
                        await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                        const response = await axios.post(`${apiUrl}/users/user_update/`, form_data, { withCredentials: true,
                        headers: {
                            'X-device_fingerprint': device_fingerprint
                        }
                        });
                        setUser(response.data);
                        onNext();
                    } catch (error: unknown) {
                        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                        setUser(null);
                    }
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
        } finally{
            setIsLoading(false)
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing={0}>

            <Grid container spacing={3} justifyContent="center" mt={1}>
                <Grid item xs={12} md={6}>
                    <TextField
                    id="first-name"
                    name="first-name"
                    value={firstName}
                    onChange={(e)=>setFirstName(e.target.value)}
                    type="text"
                    label="First Name"
                    variant="outlined"
                    fullWidth
                    />
                    {userdetailsValidationErrors.firstName && (!firstName || !/^[A-Za-z\s]+$/.test(firstName)) && (
                      <div style={{ color: "red" }}>{userdetailsValidationErrors.firstName}</div>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                    id="last-name"
                    name="last-name"
                    value={lastName}
                    onChange={(e)=>setLastName(e.target.value)}
                    type="text"
                    label="Last Name"
                    variant="outlined"
                    fullWidth
                    />
                    {userdetailsValidationErrors.lastName && (!lastName || !/^[A-Za-z\s]+$/.test(lastName)) && (
                      <div style={{ color: "red" }}>{userdetailsValidationErrors.lastName}</div>
                    )}
                </Grid>
                    <Grid item xs={12} md={6}>
                        <PhoneInput
                            country={'in'}
                            value={telephoneNumber}
                            onChange={(value, country: any) => {
                                setTelephoneNumber(value);
                                setCountryDialCode(`+${country.dialCode}`); // Set the country dial code
                              }}
                            inputProps={{
                            name: 'telephone-number',
                            autoFocus: false,
                            }}
                            inputStyle={{
                            width: '100%',
                            height: '56px',
                            fontSize: '16px',
                            borderRadius: '4px',
                            paddingLeft: '48px',
                            backgroundColor: '#fafbfb'
                            }}
                        />
                        {userdetailsValidationErrors.phoneNumber && <div style={{"color": "red"}}>{userdetailsValidationErrors.phoneNumber}</div>}
                    </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                    id="email"
                    name="email"
                    type="text"
                    label="Email"
                    variant="outlined"
                    defaultValue={user?.email}
                    fullWidth
                    disabled
                    />
                </Grid>
            </Grid>

            </Stack>
            <br />
            <Box sx={{ display: 'flex', justifyContent: 'space-between'}}>
                <Button sx={{ mr: 1 }} variant='contained' onClick={handleBack}>
                    Back 
                </Button>
                {<Button type="submit" variant='contained' sx={{width: "150px"}}>
                    {isLoading? <CircularProgress size={20} color="inherit" />: `Submit & Proceed`}
                </Button>}
            </Box>
      </form>
    );
};

export default UserDetailsForm;