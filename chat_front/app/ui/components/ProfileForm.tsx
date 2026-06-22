'use client';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BaseCard from '@/app/ui/components/BaseCard';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DetectRefreshToken } from '@/app/utils/actions';
import { useUser } from '@/app/context/user-context';
import { CountryDropdown, RegionDropdown, CountryRegionData } from 'react-country-region-selector';
import '../stylesheets/style.css'
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
import {z} from 'zod';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import KYCUpload from './KYCBox';
import AnimaticLoader from './AnimaticLoader';
import React from "react";
import { DndContext, closestCenter, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, Typography, IconButton, List, ListItem, ListItemText } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

type Role = string;
type ServiceRoles = Record<string, Role[]>; // Mapping service name -> list of roles

const availableRoles: ServiceRoles = {
  "VM Service": ["vm_viewer", "vm_editor"],
  "Domain Service": ["domain_viewer", "domain_editor"],
};

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

type ItemType = {
  isAdmin: boolean;
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

type UserDetailsValidationErrors = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

const baseSchema = {
  streetAddress: z.string().min(1, { message: 'Street Address must not be empty' }),
  postalCode: z.string().min(1, { message: 'Postal Code must not be empty' }).regex(/^\d+$/, { message: 'Invalid Zipcode' }),
  city: z.string().min(1, { message: 'City must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'Invalid City' }) // Allows only letters and spaces
};

const userDetailsSchema = z.object({
  firstName: z.string()
            .min(1, { message: 'First Name must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'First Name must contain only alphabets' }),
  lastName: z.string().min(1, { message: 'Last Name must not be empty' }).regex(/^[A-Za-z\s]+$/, { message: 'Last Name must contain only alphabets' }),
  phoneNumber: z.string().min(1, { message: 'Phone number must not be empty' }),
});


const ProfileForm = ({ isAdmin }: ItemType) => {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [selectedType, setSelectedType] = useState(user?.organisation.type || 'personal');
  const [country, setCountry] = useState(user?.organisation.country || 'India');
  const [region, setRegion] = useState(user?.organisation.state || '');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [userdetailsValidationErrors, setUserDetailsValidationErrors] = useState<UserDetailsValidationErrors>({})
  const [organisationName, setOrganisationName] = useState(user?.organisation.organization_name)
  const [vatgstin, setVatGSTIN] = useState(user?.organisation.vat_or_gst_in)
  const [streetAddress, setStreetAddress] = useState(user?.organisation.street_address)
  const [addressLine2, setAddressLine2] = useState(user?.organisation.address_line_2)
  const [postalCode, setPostalCode] = useState(user?.organisation.postal_code)
  const [city, setCity] = useState(user?.organisation.city)
  const [telephoneNumber, setTelephoneNumber] = useState(user?.telephone_number)
  const [firstName, setFirstName] = useState(user?.first_name)
  const [lastName, setLastName] = useState(user?.last_name)
  const [isLoadingOrgUpdate, setIsLoadingOrgUpdate] = useState(false);
  const [isLoadingUserUpdate, setIsLoadingUserUpdate] = useState(false);
  const [countryDialCode, setCountryDialCode] = useState('+91'); // Default 
  const [buttonStatus, setButtonStatus] = useState<'default' | 'loading' | 'success'>('default');
  const [userButtonStatus, setUserButtonStatus] = useState<'default' | 'loading' | 'success'>('default');
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

    console.log("🧾 user.ssssssssssssss:", organisationName);
  const [assignedRoles, setAssignedRoles] = useState<ServiceRoles>({});
// Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const fromService = active.data.current?.service as string;
    const toService = over.id as string;


    if (fromService === toService) {
      const roleName = active.id as string;

      setAssignedRoles((prev) => {
        const newAssignedRoles: ServiceRoles = { ...prev };

        if (!newAssignedRoles[toService]) newAssignedRoles[toService] = [];
        if (!newAssignedRoles[toService].includes(roleName)){
          newAssignedRoles[toService].push(roleName);
        }
        

        return newAssignedRoles;
      });
    }
  };

  // Remove role
  const handleRemoveRole = (service: string, role: string) => {
    setAssignedRoles((prev) => ({
      ...prev,
      [service]: prev[service].filter((r) => r !== role),
    }));
  };
  const handleRadioChange = (event: any) => {
    setSelectedType(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setButtonStatus('loading'); // Set to loading state
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
        setButtonStatus('default')
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
      setButtonStatus('success');
      setUser(response.data);
      // Keep the success state for a short duration, then reset back to default
      setTimeout(() => {
        setButtonStatus('default');
      }, 3000); // Show success state for 3 seconds
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 401) {
              // Token might be expired, attempt to refresh it but before check if the user is in the login page.
              try {
                  const device_fingerprint = await getClientFingerprint();
                  await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                  const response = await axios.post(`${apiUrl}/users/org_update/`, form_data, { withCredentials: true,
                    headers: {
                      'X-device_fingerprint': device_fingerprint
                    }
                  });
                  setButtonStatus('success');
                  setUser(response.data);
                  // Keep the success state for a short duration, then reset back to default
                  setTimeout(() => {
                    setButtonStatus('default');
                  }, 3000); // Show success state for 3 seconds
              } catch (error: unknown) {
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                  setUser(null);
                  router.push('/login')
              }
          }
          else{
            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
            setUser(null);
            router.push('/login')
          } 
      } else {
          console.error('Failed to fetch user:', error);
          setUser(null);
          router.push('/login')
      }
    }finally{
      // setButtonStatus('default');
    }
  };

  const handleUserSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserButtonStatus('loading')
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
      setUserButtonStatus('default')
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
        setUserButtonStatus('default')
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
      setUserButtonStatus('success');
      setUser(response.data);
      // Keep the success state for a short duration, then reset back to default
      setTimeout(() => {
        setUserButtonStatus('default');
      }, 3000); // Show success state for 3 seconds
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
                setUserButtonStatus('success');
                setUser(response.data);
                // Keep the success state for a short duration, then reset back to default
                setTimeout(() => {
                  setUserButtonStatus('default');
                }, 3000); // Show success state for 3 seconds
            } catch (error: unknown) {
              await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
                router.push('/login')
            }
        }
        else{
          await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
          setUser(null);
          router.push('/login')
        } 
    } else {
        console.error('Failed to fetch user:', error);
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        setUser(null);
        router.push('/login')
    }
    }finally{
      // setUserButtonStatus('default')
    }
  };

  useEffect(() => {
    console.log("here")
    const initializeUser = async () => {
      const refresh_token_present = await DetectRefreshToken();
      if (!refresh_token_present) {
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        setUser(null)
      }
    };
    initializeUser();
  }, []);


  return (
    <Box mt={3}>
      {isAdmin ? (
        <BaseCard title="Organisation Details">
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
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value)) { 
                          setPostalCode(value);
                        }
                      }}
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
                      onChange={(e) => {
                        let value = e.target.value;
                    
                        // Prevent spaces at the beginning
                        if (/^[A-Za-z\s]*$/.test(value) && !/^\s/.test(value)) {
                          setCity(value);
                        }
                      }}
                    
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
      ) : null}

  
      <br />
      <br />


            {/* User Detail Form */}



      <BaseCard title="User Details">
        <form onSubmit={handleUserSubmit}>
          <Stack spacing={0}>

            <Grid container spacing={3}>
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
          <Button
              variant="contained"
              type="submit"
              disabled={userButtonStatus === "loading"}
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
              {userButtonStatus === "loading" ? (
                <CircularProgress size={18} color="inherit" />  // CircularProgress scaled down to 3/4
              ) : userButtonStatus === "success" ? (
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
    .user-circle {
      stroke-dasharray: 94;
      stroke-dashoffset: 94;
    }
    svg .user-circle {
      animation: user-circle 1s ease-in-out;
      animation-fill-mode: forwards;
    }
    .user-tick {
      stroke-dasharray: 35;
      stroke-dashoffset: 35;
    }
    svg .user-tick {
      animation: user-tick 0.8s ease-out;
      animation-fill-mode: forwards;
      animation-delay: 0.95s;
    }

    @keyframes user-circle {
      from {
        stroke-dashoffset: 94;
      }
      to {
        stroke-dashoffset: 188;
      }
    }

    @keyframes user-tick {
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

      <br />
      <br />
      
      {isAdmin && <BaseCard title="KYC section">
        <KYCUpload />
      </BaseCard>}

      {false&&<DndContext onDragEnd={handleDragEnd}>
      <Box display="flex" gap={3}>
        {/* Available Roles */}
        <Box width="50%">
          <Typography variant="h6">Available Roles</Typography>
          {Object.keys(availableRoles).map((service) => (
            <DroppableArea key={service} id={service}>
              <Typography variant="subtitle1">{service}</Typography>
              <List component={Paper} sx={{ maxHeight: 150, overflow: "auto" }}>
                {availableRoles[service].map((role) => (
                  <DraggableRole key={role} id={role} service={service}>
                    <ListItemText primary={role} />
                  </DraggableRole>
                ))}
              </List>
            </DroppableArea>
          ))}
        </Box>

        {/* Assigned Roles */}
        <Box width="50%">
          <Typography variant="h6">Assigned Roles</Typography>
          {Object.keys(availableRoles).map((service) => (
            <DroppableArea key={service} id={service}>
              <Typography variant="subtitle1">{service}</Typography>
              <Paper sx={{ minHeight: 80, p: 1 }}>
                <List>
                  {assignedRoles[service]?.map((role) => (
                    <ListItem key={role} sx={{ display: "flex", justifyContent: "space-between" }}>
                      <ListItemText primary={role} />
                      <Button size="small" color="error" onClick={() => handleRemoveRole(service, role)}>
                        Remove
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </DroppableArea>
          ))}
        </Box>
      </Box>
    </DndContext>}
    </Box>
  );
};

const DraggableRole = ({ id, service, children }: { id: string; service: string; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { service },
  });

  const style = {
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    cursor: "grab",
    backgroundColor: "#f0f0f0",
    padding: "5px",
    borderRadius: "4px",
  };

  return (
    <ListItem ref={setNodeRef} {...listeners} {...attributes} sx={style}>
      {children}
    </ListItem>
  );
};

// Droppable Area Component
const DroppableArea = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <Box ref={setNodeRef} sx={{ border: "1px dashed gray", minHeight: "80px", padding: "10px" }}>
      {children}
    </Box>
  );
};


export default ProfileForm;