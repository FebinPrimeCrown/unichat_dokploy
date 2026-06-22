'use client'
import React, { useState, useEffect } from "react";
import { TextField, Button, Switch, FormControlLabel, Card, CardContent, Typography, Box, Grid, Avatar, CircularProgress, Snackbar, Alert, AlertTitle, InputAdornment, IconButton, Stack } from "@mui/material";
import { IconArticle } from "@tabler/icons-react";
import {z} from 'zod'
import { useRouter } from "next/navigation";
import axios, { AxiosError } from "axios";
import { useUser } from "@/app/context/user-context";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Visibility, VisibilityOff } from '@mui/icons-material';

function generatePassword(length = 12) {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  return Array.from({ length }, () =>
    charset.charAt(Math.floor(Math.random() * charset.length))
  ).join('');
}

async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get()
    return result.visitorId;
  }

const FormSchema = z.object({
    email: z.string().superRefine((val, ctx) => {
        if (!val || val.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter your email address',
          });
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Enter a valid email address',
            });
          }
        }
      }),
    firstname: z.string().superRefine((val, ctx) => {
        if (!val || val.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter your first name',
          });
        } else if (!/^[A-Za-z\s]+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'First Name must contain only alphabets',
          });
        }
      }),
      lastname: z.string().superRefine((val, ctx) => {
        if (!val || val.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter your last name',
          });
        } else if (!/^[A-Za-z\s]+$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Last Name must contain only alphabets',
          });
        }
      }),
    password: z.string()
            .min(8, { message: 'Password must not be empty' })
});

type ValidationErrors = {
  [key: string]: string | string[] | undefined;
};

const CreateUserForm = () => {
    const [userData, setUserData] = useState<{
        first_name: string;
        last_name: string;
        email: string;
        password: string;
        roles: string[];
    }>({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        roles: [],
    });

    const [vmReadOnly, setVmReadOnly] = useState(false);
    const [vmFullAccess, setVmFullAccess] = useState(false);
    const [hostingReadOnly, setHostingReadOnly] = useState(false);
    const [hostingFullAccess, setHostingFullAccess] = useState(false);
    const [mdReadOnly, setMDReadOnly] = useState(false);
    const [mdFullAccess, setMDFullAccess] = useState(false);
    const [bmsReadOnly, setBMSReadOnly] = useState(false);
    const [bmsFullAccess, setBMSFullAccess] = useState(false);
    const [domainReadOnly, setDomainReadOnly] = useState(false);
    const [domainFullAccess, setDomainFullAccess] = useState(false);
    const [emailReadOnly, setEmailReadOnly] = useState(false);
    const [webbuilderReadOnly, setWebbuilderReadOnly] = useState(false);
    const [emailFullAccess, setEmailFullAccess] = useState(false);
    const [webbuilderFullAccess, setWebbuilderFullAccess] = useState(false);
    const [billingReadOnly, setBillinReadOnly] = useState(false);
    const [billingFullAccess, setBillingFullAccess] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false)
    const [snackbarMessage, setSnackbarMessage] = useState("")
    const [userButtonStatus, setUserButtonStatus] = useState<'default' | 'loading' | 'success'>('default');
    const [snackBarSeverity, setSnackBarSeverity] = useState<"success" | "error">("success");
    const [showPassword, setShowPassword] = useState(false);
    const {user, setUser} = useUser()

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

    useEffect(() => {
        const email = userData.email;
        if (email){
            if (validationErrors.email && validationErrors.email === "Enter your email address"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    email: '',
                  }))
            }
        }
        if (!email){
            if (validationErrors.email && validationErrors.email === "Enter a valid email address"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    email: '',
                  }))
            }
        }
      }, [userData.email]);

      useEffect(() => {
        const first_name = userData.first_name;
        if (first_name){
            if (validationErrors.firstname && validationErrors.firstname === "Enter your first name"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    firstname: '',
                  }))
            }
        }
        if (!first_name){
            if (validationErrors.firstname && validationErrors.firstname === "First Name must contain only alphabets"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    firstname: '',
                  }))
            }
        }
      }, [userData.first_name]);

      useEffect(() => {
        const last_name = userData.last_name;
        if (last_name){
            if (validationErrors.lastname && validationErrors.lastname === "Enter your last name"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    lastname: '',
                  }))
            }
        }
        if (!last_name){
            if (validationErrors.lastname && validationErrors.lastname === "Last Name must contain only alphabets"){
                setValidationErrors((prevErrors) => ({
                    ...prevErrors,
                    lastname: '',
                  }))
            }
        }
      }, [userData.last_name]);

    const handleGenerate = () => {
        const newPass = generatePassword();
        setUserData({ ...userData, password: newPass })
        setValidationErrors((prevErrors) => ({
            ...prevErrors,
            password: '',
          }));
        setShowPassword(false); // Keep it hidden after generation
      };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true); // Start loading
        setValidationErrors({});

        try{
            const validatedFields = FormSchema.parse({
                email: userData["email"],
                password: userData["password"],
                firstname: userData["first_name"],
                lastname: userData["last_name"]
            });
        }catch (error: any) {
            setUserButtonStatus('default') // Stop loading on error
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
                console.log(fieldErrors)
            }
            window.scrollTo(0, 0);
            return
        }

        const form_data = {
            first_name: userData["first_name"],
            last_name: userData["last_name"],
            email: userData["email"],
            password: userData["password"],
            roles: userData["roles"]
        };

        try{

            const device_fingerprint = await getClientFingerprint();
            const response = await axios.post(`${apiUrl}/users/add_user/`, form_data, { withCredentials: true,
              headers: {
                'X-device_fingerprint': device_fingerprint
              }
            });
          
            setUserButtonStatus('success');
            setSnackBarSeverity("success")
            setSnackbarMessage("Successfully added new user")
            setSnackbarOpen(true)
            setTimeout(() => {
                setUserButtonStatus('default');
                window.scrollTo(0, 0);
              }, 3000); // Show success state for 3 seconds
            setUserData({first_name: "",
                last_name: "",
                email: "",
                password: "",
                roles: [],})
            setVmReadOnly(false)
            setVmFullAccess(false)
            setMDReadOnly(false)
            setMDFullAccess(false)
            setBMSReadOnly(false)
            setBMSFullAccess(false)
            setHostingReadOnly(false)
            setHostingFullAccess(false)
            setDomainFullAccess(false)
            setDomainReadOnly(false)
            setEmailReadOnly(false)
            setEmailFullAccess(false)
            setWebbuilderReadOnly(false)
            setWebbuilderFullAccess(false)
            setBillinReadOnly(false)
            setBillingFullAccess(false)
        }catch (error: unknown) {
            if (axios.isAxiosError(error)) {
              if (error.response && error.response.status === 401) {
                  // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                  try {
                      const device_fingerprint = await getClientFingerprint();
                      await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                      const response = await axios.post(`${apiUrl}/users/add_user/`, form_data, { withCredentials: true,
                        headers: {
                          'X-device_fingerprint': device_fingerprint
                        }
                      });
                        setUserButtonStatus('success');
                        setSnackBarSeverity("success")
                        setSnackbarMessage("Successfully added new user")
                        setSnackbarOpen(true)
                        setTimeout(() => {
                            setUserButtonStatus('default');
                            window.scrollTo(0, 0);
                        }, 3000); // Show success state for 3 seconds
                        setUserData({first_name: "",
                            last_name: "",
                            email: "",
                            password: "",
                            roles: [],})
                        setVmReadOnly(false)
                        setVmFullAccess(false)
                        setMDReadOnly(false)
                        setMDFullAccess(false)
                        setBMSReadOnly(false)
                        setBMSFullAccess(false)
                        setHostingReadOnly(false)
                        setHostingFullAccess(false)
                        setDomainFullAccess(false)
                        setDomainReadOnly(false)
                        setEmailReadOnly(false)
                        setEmailFullAccess(false)
                        setWebbuilderReadOnly(false)
                        setWebbuilderFullAccess(false)
                        setBillinReadOnly(false)
                        setBillingFullAccess(false)
                  } catch (error: unknown) {
                    if (axios.isAxiosError(error)){
                      if (error.response && error.response.status === 401){
                        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                        setUser(null);
                      }
                      else if (error.response && error.response.status === 400){
                        setSnackBarSeverity("error")
                        setSnackbarOpen(true)
                        setSnackbarMessage(error.response?.data?.detail)
                        setUserButtonStatus('default')
                      }
                      else{
                        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                        setUser(null);
                      }
                    }
                    else{
                      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                      setUser(null);
                    }
                  }
              }
              else if (error.response && error.response.status === 400){
                setSnackBarSeverity("error")
                setSnackbarOpen(true)
                setSnackbarMessage(error.response?.data?.detail)
                setUserButtonStatus('default')
              }
              else{
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
              }
          } else {
              await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
              setUser(null);
          }
          }
        
        
    };

    console.log(userData)

    const handleRoleChange = (section: string, type: "viewer" | "editor", checked: boolean) => {
        setUserData((prevData) => {
            let updatedRoles = [...prevData.roles];

            if (section === "vm") {
                if (type === "viewer") {
                    setVmReadOnly(checked);
                    if (checked) updatedRoles.push("vm_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "vm_viewer");
                } else {
                    setVmFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("vm_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "vm_editor");
                    }
                }
            }

            if (section === "hosting") {
                if (type === "viewer") {
                    setHostingReadOnly(checked);
                    if (checked) updatedRoles.push("hosting_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "hosting_viewer");
                } else {
                    setHostingFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("hosting_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "hosting_editor");
                    }
                }
            }

            if (section === "md") {
                if (type === "viewer") {
                    setMDReadOnly(checked);
                    if (checked) updatedRoles.push("md_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "md_viewer");
                } else {
                    setMDFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("md_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "md_editor");
                    }
                }
            }

            if (section === "bms") {
                if (type === "viewer") {
                    setBMSReadOnly(checked);
                    if (checked) updatedRoles.push("bms_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "bms_viewer");
                } else {
                    setBMSFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("bms_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "bms_editor");
                    }
                }
            }

            if (section === "domain") {
                if (type === "viewer") {
                    setDomainReadOnly(checked);
                    if (checked) updatedRoles.push("domain_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "domain_viewer");
                } else {
                    setDomainFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("domain_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "domain_editor");
                    }
                }
            }

            if (section === "email") {
                if (type === "viewer") {
                    setEmailReadOnly(checked);
                    if (checked) updatedRoles.push("email_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "email_viewer");
                } else {
                    setEmailFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("email_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "email_editor");
                    }
                }
            }

            if (section === "wb") {
                if (type === "viewer") {
                    setWebbuilderReadOnly(checked);
                    if (checked) updatedRoles.push("wb_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "wb_viewer");
                } else {
                    setWebbuilderFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("wb_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "wb_editor");
                    }
                }
            }

            if (section === "billing") {
                if (type === "viewer") {
                    setBillinReadOnly(checked);
                    if (checked) updatedRoles.push("billing_viewer");
                    if (!checked) updatedRoles = updatedRoles.filter((role) => role !== "billing_viewer");
                } else {
                    setBillingFullAccess(checked);
                    if (checked) {
                        updatedRoles.push("billing_editor");
                    } else {
                        updatedRoles = updatedRoles.filter((role) => role !== "billing_editor");
                    }
                }
            }

            return { ...prevData, roles: updatedRoles };
        });
    };

    return (
        <>
        <Card sx={{ mx: "auto", mt: 4, p: 3 }}>
            <CardContent>
                <Typography variant="h3" gutterBottom>Add User</Typography>
                <Typography color="silver" gutterBottom>Add a new user to your organisation</Typography>
                
                <form onSubmit={handleSubmit}>
                    {/* User Details */}
                    <Grid container spacing={2}>
                        {/* First Name + Last Name */}
                        <Grid item xs={12} md={6}>
                            <TextField
                            label="First Name"
                            value={userData["first_name"]}
                            fullWidth
                            margin="normal"
                            onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                            />
                            {validationErrors.firstname && (
                                <div style={{ color: 'red' }}>{validationErrors.firstname}</div>
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                            label="Last Name"
                            value={userData["last_name"]}
                            fullWidth
                            margin="normal"
                            onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                            />
                            {validationErrors.lastname && (
                                <div style={{ color: 'red' }}>{validationErrors.lastname}</div>
                            )}
                        </Grid>

                        {/* Email */}
                        <Grid item xs={12} md={6}>
                            <TextField
                            label="Email"
                            value={userData["email"]}
                            fullWidth
                            margin="normal"
                            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                            />
                            {validationErrors.email && (
                                <div style={{ color: 'red' }}>{validationErrors.email}</div>
                            )}
                        </Grid>

                        {/* Password + Auto-generate */}
                        <Grid item xs={12} md={6}>
                            <Stack direction="row" spacing={2} mt={2} alignItems="flex-start" width="100%">
                            <TextField
                                label="Password"
                                value={userData["password"]}
                                type={showPassword ? 'text' : 'password'}
                                margin="normal"
                                InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                    </InputAdornment>
                                ),
                                }}
                                sx={{ flex: 1 }}
                            />

                            <Button
                                variant="contained"
                                onClick={handleGenerate}
                                sx={{ mt: 2, whiteSpace: 'nowrap', height: 43 }}
                            >
                                Auto-generate
                            </Button>
                            </Stack>
                            {validationErrors.password && (
                            <div style={{ color: 'red', marginTop: 5}}>{validationErrors.password}</div>
                            )}
                        </Grid>
                    </Grid>
                    {/* Roles Section */}
                    <Box sx={{ mt: 3 }}>
                        {/* VM Hosting Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">VM Hosting</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">VM Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to virtual machines.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel 
                                            control={<Switch color="success" checked={vmReadOnly} onChange={(e) => {
                                                if (vmFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("vm", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel 
                                            control={<Switch color="primary" checked={vmFullAccess} onChange={(e) => {if (!vmReadOnly && e.target.checked) return; handleRoleChange("vm", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* MD Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Managed Databases</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Managed Database Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to managed databases.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel
                                            control={<Switch color="success" checked={mdReadOnly} onChange={(e) => {
                                                if (mdFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("md", "viewer", e.target.checked);
                                              }} />}
                                            label="View"
                                        />
                                        <FormControlLabel
                                            control={<Switch color="primary" checked={mdFullAccess} onChange={(e) => {if (!mdReadOnly && e.target.checked) return; handleRoleChange("md", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Bare Metal Servers Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Bare Metal Servers</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Bare Metal Server Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to bare metal servers.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel 
                                            control={<Switch color="success" checked={bmsReadOnly} onChange={(e) => {
                                                if (bmsFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("bms", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel 
                                            control={<Switch color="primary" checked={bmsFullAccess} onChange={(e) => {if (!bmsReadOnly && e.target.checked) return; handleRoleChange("bms", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Hosting Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Hosting</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4">Hosting Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to hosting services.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5}  display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel
                                            control={<Switch color="success" checked={hostingReadOnly} onChange={(e) => {
                                                if (hostingFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("hosting", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel
                                            control={<Switch color="primary" checked={hostingFullAccess} onChange={(e) => {if (!hostingReadOnly && e.target.checked) return; handleRoleChange("hosting", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Domains Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Domains</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Domain Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to domains.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel 
                                            control={<Switch color="success" checked={domainReadOnly} onChange={(e) => {
                                                if (domainFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("domain", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel 
                                            control={<Switch color="primary" checked={domainFullAccess} onChange={(e) => {if (!domainReadOnly && e.target.checked) return; handleRoleChange("domain", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
    
                        {/* Emails Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Emails</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Email Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to emails.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel
                                            control={<Switch color="success" checked={emailReadOnly} onChange={(e) => {
                                                if (emailFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("email", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel
                                            control={<Switch color="primary" checked={emailFullAccess} onChange={(e) => {if (!emailReadOnly && e.target.checked) return; handleRoleChange("email", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>






                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Web builder</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Web Builder Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to web builder.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel
                                            control={<Switch color="success" checked={webbuilderReadOnly} onChange={(e) => {
                                                if (webbuilderFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("wb", "viewer", e.target.checked);
                                              }} />} 
                                            label="View" 
                                        />
                                        <FormControlLabel
                                            control={<Switch color="primary" checked={webbuilderFullAccess} onChange={(e) => {if (!webbuilderReadOnly && e.target.checked) return; handleRoleChange("wb", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>












                        {/* Billing Section */}
                        <Card variant="outlined" sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="h4">Billing</Typography>
                                <Grid container alignItems="center" spacing={2} paddingTop={2}>
                                    <Grid item xs={2} sm={2} md={1}>
                                        <Avatar
                                            variant="rounded"
                                            sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
                                            >
                                            <IconArticle size="22" />
                                        </Avatar>
                                    </Grid>
                                    {/* Left Side: Heading & Description */}
                                    <Grid item xs={10} sm={10} md={6} lg={6}>
                                        <Typography variant="h4" color="color.secondary">Billing Access</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Manage access to billing.
                                        </Typography>
                                    </Grid>

                                    {/* Right Side: Switches */}
                                    <Grid item xs={12} sm={12} md={5} lg={5} display="flex" flexDirection="row" alignItems="flex-start">
                                        <FormControlLabel
                                            control={<Switch color="success" checked={billingReadOnly} onChange={(e) => {
                                                if (billingFullAccess && !e.target.checked) return; // 🚫 prevent turning off "view" when "full access" is on
                                                handleRoleChange("billing", "viewer", e.target.checked);
                                              }} />}
                                            label="View"
                                        />
                                        <FormControlLabel
                                            control={<Switch color="primary" checked={billingFullAccess} onChange={(e) => {if (!billingReadOnly && e.target.checked) return; handleRoleChange("billing", "editor", e.target.checked)}} />} 
                                            label="Full Access" 
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Box>

                    <Button
                        variant="contained"
                        fullWidth
                        type="submit"
                        disabled={userButtonStatus === "loading"}
                        sx={{
                            width: '100%',   // 150px * 3/4 = 112.5px
                            height: '37.5px',   // 50px * 3/4 = 37.5px
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            fontSize: '13px',    // Adjust font size to 3/4 of original
                            mt: 5
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
                            "Create User"
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
            </CardContent>
        </Card>
        <Snackbar
                open={snackbarOpen}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                autoHideDuration={3000}
                onClose={()=>setSnackbarOpen(false)}
            >
                <Alert
                severity={snackBarSeverity}
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

export default CreateUserForm;