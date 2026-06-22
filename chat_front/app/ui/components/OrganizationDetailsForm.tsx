import React from 'react';
import '@/app/ui/stylesheets/style.css'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useRouter } from 'next/navigation';
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
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/app/context/user-context';
import { CountryDropdown, RegionDropdown, CountryRegionData } from 'react-country-region-selector';
import { DetectRefreshToken } from '@/app/utils/actions';
import axios from 'axios';
import {z} from 'zod';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface OrganizationDetailsFormProps {
  onNext: () => void;
//   setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

type ValidationErrors = {
    organisationName?: string;
    vatOrGstIn?: string;
    type?: string;
    streetAddress?: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country?: string;
};

const baseSchema = {
    streetAddress: z.string().min(1, { message: 'Street Address must not be empty' }),
    postalCode: z.string().min(1, { message: 'Postal Code must not be empty' }).regex(/^\d+$/, { message: 'Invalid Zipcode' }),
    city: z.string().min(1, { message: 'City must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'Invalid City' }) // Allows only letters and spaces
};

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
  }

const OrganizationDetailsForm = ({ onNext }: OrganizationDetailsFormProps) => {
    const router = useRouter()
    const { user, setUser } = useUser();
    const [selectedType, setSelectedType] = useState(user?.organisation.type || 'personal');
    const [country, setCountry] = useState(user?.organisation.country || 'India');
    const [region, setRegion] = useState(user?.organisation.state || '');
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [organisationName, setOrganisationName] = useState(user?.organisation.organization_name)
    const [vatgstin, setVatGSTIN] = useState(user?.organisation.vat_or_gst_in)
    const [streetAddress, setStreetAddress] = useState(user?.organisation.street_address)
    const [addressLine2, setAddressLine2] = useState(user?.organisation.address_line_2)
    const [postalCode, setPostalCode] = useState(user?.organisation.postal_code)
    const [city, setCity] = useState(user?.organisation.city)
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

    useEffect(() => {
        const initializeUser = async () => {
            console.log("here")
            const refresh_token_present = await DetectRefreshToken();
            if (!refresh_token_present) {
            router.push('/login');
            }
        };
        initializeUser();
    }, []);

    const handleRadioChange = (event: any) => {
        setSelectedType(event.target.value);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true)
        const formData = new FormData(event.currentTarget);
        const data: any = {
            streetAddress: formData.get('street-address')?.toString() || '',
            addressLine2: formData.get('address-line-2')?.toString() || '',
            postalCode: formData.get('postal-code')?.toString() || '',
            city: formData.get('city')?.toString() || ''
        };

        if (selectedType === 'business' && user?.organisation.type === null) {
            data.organisationName = formData.get('organisation-name')?.toString() || '';
            data.vatOrGstIn = formData.get('vat-gst-in')?.toString() || '';
        }

        if (user?.organisation.country === null){
            data.country = formData.get('country')?.toString() || ''
        }
        if (user?.organisation.state === null){
            data.state = formData.get('state')?.toString() || ''
        }
        if (user?.organisation.type === null){
            data.type = formData.get('type')?.toString() || ''
        }

        const schema = z.object({
            ...baseSchema,
            ...(selectedType === 'business' && user?.organisation.type === null && {
            organisationName: z.string().min(1, { message: 'Organisation Name must not be empty' }),
            vatOrGstIn: z.string().min(1, { message: 'VAT/GST In must not be empty' })}),
            ...(user?.organisation.country === null && {
            country: z.string().min(1, { message: 'Country must not be empty' })}),
            ...(user?.organisation.state === null && {
            state: z.string().min(1, { message: 'State must not be empty' })}),
            ...(user?.organisation.type === null && {
            type: z.string().min(1, { message: 'Type must not be empty' })}),
        })

        try {
            schema.parse(data);
        } catch (error) {
            console.log("error here")
            if (error instanceof z.ZodError) {
            const fieldErrors: { [key: string]: string } = {};
            error.errors.forEach((err) => {
                fieldErrors[err.path[0]] = err.message;
            });
            console.log(fieldErrors)
            setValidationErrors(fieldErrors);
            setIsLoading(false)
            return;
            }
        }

        const form_data = {
            "type": selectedType,
            "organisation_name": organisationName,
            "vat_or_gst_in": vatgstin,
            "street_address": streetAddress,
            "address_line_2": addressLine2,
            "postal_code": postalCode,
            "city": city,
            "state": region,
            "country": country
        };

        console.log(form_data);
        
        // Send the data to the backend
        
        try {
            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/org_update/`, form_data, { withCredentials: true,
            headers: {
                'X-device_fingerprint': device_fingerprint
            }
            });
            setUser(response.data);
            onNext()
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                if (error.response && error.response.status === 401) {
                    // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                    try {
                        const device_fingerprint = await getClientFingerprint();
                        await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                        const response = await axios.post('${apiUrl}/users/org_update/', form_data, { withCredentials: true,
                            headers: {
                            'X-device_fingerprint': device_fingerprint
                            }
                        });
                        setUser(response.data);
                        onNext()
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
                <FormControl>
                    <FormLabel id="demo-radio-buttons-group-label"></FormLabel>
                    <RadioGroup
                    aria-labelledby="demo-radio-buttons-group-label"
                    defaultValue={selectedType}
                    name="type"
                    row
                    onChange={handleRadioChange}
                    >
                    <FormControlLabel
                        value="business"
                        control={<Radio />}
                        label="Business"
                        disabled={user?.organisation.type != null}
                    />
                    <FormControlLabel
                        value="personal"
                        control={<Radio />}
                        label="Personal"
                        disabled={user?.organisation.type != null}
                    />
                    </RadioGroup>
                </FormControl>
                <br />
                <Grid container spacing={3} justifyContent="center">
                    {selectedType === 'business' && (<Grid item xs={12} md={6}>
                        <TextField
                        id="organisation-name"
                        name="organisation-name"
                        value={organisationName}
                        onChange={(e)=>setOrganisationName(e.target.value)}
                        type="text"
                        label="Organisation Name"
                        variant="outlined"
                        disabled={user?.organisation.type != null}
                        fullWidth
                        />
                        {validationErrors.organisationName && !organisationName && <div style={{"color": "red"}}>{validationErrors.organisationName}</div>}
                    </Grid>)}
                    {selectedType === 'business' && (<Grid item xs={12} md={6}>
                        <TextField
                        id="vat-gst-in"
                        name="vat-gst-in"
                        type="text"
                        value={vatgstin}
                        onChange={(e)=>setVatGSTIN(e.target.value)}
                        label="VAT/GST IN"
                        variant="outlined"
                        disabled={user?.organisation.type != null}
                        fullWidth
                        />
                        {validationErrors.vatOrGstIn &&  !vatgstin && <div style={{"color": "red"}}>{validationErrors.vatOrGstIn}</div>}
                    </Grid>)}
                    <Grid item xs={12} md={6}>
                        <TextField
                        id="street-address"
                        name="street-address"
                        type="text"
                        value={streetAddress}
                        onChange={(e)=>setStreetAddress(e.target.value)}
                        label="Street Address"
                        variant="outlined"
                        fullWidth
                        />
                        {validationErrors.streetAddress && !streetAddress && <div style={{"color": "red"}}>{validationErrors.streetAddress}</div>}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                        id="address-line-2"
                        name="address-line-2"
                        type="text"
                        value={addressLine2}
                        onChange={(e)=>setAddressLine2(e.target.value)}
                        label="Address Line 2"
                        variant="outlined"
                        fullWidth
                        />
                        {validationErrors.addressLine2 && !addressLine2 && <div style={{"color": "red"}}>{validationErrors.addressLine2}</div>}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                        id="postal-code"
                        name="postal-code"
                        type="text"
                        value={postalCode}
                        onChange={(e)=>setPostalCode(e.target.value)}
                        label="Postal Code"
                        variant="outlined"
                        fullWidth
                        />
                        {validationErrors.postalCode && (!postalCode || !/^\d+$/.test(postalCode)) && (
                        <div style={{ color: "red" }}>{validationErrors.postalCode}</div>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                        id="city"
                        name="city"
                        type="text"
                        value={city}
                        onChange={(e)=>setCity(e.target.value)}
                        label="City"
                        variant="outlined"
                        fullWidth
                        />
                        {validationErrors.city && (!city || !/^[A-Za-z\s]+$/.test(city)) && (
                            <div style={{ color: "red" }}>{validationErrors.city}</div>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <RegionDropdown name='state' classes='custom-dropdown'
                        country={country}
                        value={region}
                        disabled = {user?.organisation.state != null}
                        onChange={(val) => setRegion(val)} />
                        {validationErrors.state && !region && <div style={{"color": "red"}}>{validationErrors.state}</div>}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <CountryDropdown name='country' showDefaultOption classes='custom-dropdown'
                        value={country}
                        disabled = {user?.organisation.country != null}
                        onChange={(val) => setCountry(val)} />
                        {validationErrors.country && !country && <div style={{"color": "red"}}>{validationErrors.country}</div>}
                    </Grid>
                
                </Grid>
            </Stack>
            <br />
            <Box sx={{ display: 'flex', justifyContent: 'space-between'}}>
                <Button sx={{ mr: 1 }} variant='contained' disabled>
                    Back 
                </Button>
                {<Button type="submit" variant='contained' sx={{width: "150px"}}>
                    {isLoading? <CircularProgress size={20} color="inherit" />: `Submit & Proceed`}
                </Button>}
            </Box>
      </form>
    );
};

export default OrganizationDetailsForm;