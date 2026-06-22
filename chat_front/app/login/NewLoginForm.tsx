"use client";
import Link from "next/link";
import { Grid, Box, Stack, Typography, useMediaQuery, CircularProgress, Snackbar, Alert, AlertTitle } from "@mui/material";
import PageContainer from "@/app/ui/components/PageContainer";
import Logo from "@/app/ui/layout/shared/logo/Logo";
import AuthLogin from "./AuthLogin";
import Image from "next/image";
import { useUser } from "../context/user-context";
import { useEffect, useState } from "react";
import { DetectRefreshToken, DetectAdminRefreshToken } from "../utils/actions";
import { useRouter, useSearchParams } from "next/navigation";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

export default function Login() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPageUrl = searchParams.get("next");
  const [isChecking, setIsChecking] = useState(true);
  const currentYear = new Date().getFullYear();
  let redirectUserKYCVariableValue = process.env.NEXT_PUBLIC_KYC_REDIRECT
  const [adminRefreshTokenFound, setAdminRefreshTokenFound] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")

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


  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up("lg"));

  useEffect(() => {
    const validateUser = async () => {
      try {
        const refreshTokenPresent = await DetectRefreshToken();
        const adminRefreshTokenPresent = await DetectAdminRefreshToken()
        if (adminRefreshTokenPresent){
          setAdminRefreshTokenFound(true)
        }
        if (!refreshTokenPresent && !adminRefreshTokenPresent) {
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking refresh token:", error);
        setUser(null);
      } finally {
        setIsChecking(false);
      }
    };

    validateUser();
  }, [setUser]);

  useEffect(() => {
    console.log("indide first")
    if (!isChecking && user) {
      console.log("chec", isChecking)
      if (user.is_admin){
        router.push("/admin")
      }
      else{
        if (nextPageUrl) {
          if ((user?.is_first_login || !user?.organisation?.kyc_finish_timestamp) && (redirectUserKYCVariableValue === 'true')) {
            router.push("/dashboard/registration");
          } else {
            router.push(nextPageUrl);
          }
        } else {
          if ((user?.is_first_login || !user?.organisation?.kyc_finish_timestamp) && (redirectUserKYCVariableValue === 'true')) {
            router.push("/dashboard/registration");
          } else {
            router.push("/dashboard");
          }
        }
      }
    }
    else{
      if(!isChecking && adminRefreshTokenFound){
        const checkAdminLoggedIn = async () => {
            console.log("called here")
            await tryAdminLogIn();
        }
      
        checkAdminLoggedIn()
      }
    }
  }, [user, isChecking, nextPageUrl, router]);

  const tryAdminLogIn = async() => {
    try {
      const device_fingerprint = await getClientFingerprint();
      const response = await axios.get(`${apiUrl}/users/me/`, { withCredentials: true,
        headers: {
          'X-device_fingerprint': device_fingerprint
        }
      });
      setUser(response.data);
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          if (error.response && error.response.status === 401) {
              // Token might be expired, attempt to refresh it but before check if the user is in the login page.
              try {
                  const device_fingerprint = await getClientFingerprint();
                  await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                  const response = await axios.get(`${apiUrl}/users/me/`, { withCredentials: true,
                    headers: {
                      'X-device_fingerprint': device_fingerprint
                    }
                  });
                  setUser(response.data);
              } catch (refreshError: unknown) {
                  if (axios.isAxiosError(refreshError)) {
                      console.error('Failed to refresh token:', refreshError.response?.data);
                  } else {
                      console.error('Failed to refresh token:', refreshError);
                  }
              }
          } else {
              console.error('Failed to fetch user:', error.response?.data);
          }
      } else {
          console.error('Failed to fetch user:', error);
      }
      }
    }

    useEffect(() => {
      document.title = isChecking ? "Checking..." : "Login Page";
    }, [isChecking]);

  if (isChecking) {
    return (
      <PageContainer title="Checking..." description="Please wait while we validate your session.">
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Typography>Loading...</Typography>
        </Box>
      </PageContainer>
    );
  }
  else{

    return (
      <PageContainer title="Login Page" description="This is the login page">
        {!user && !adminRefreshTokenFound ? (
          <Grid container spacing={0} justifyContent="center" position={"relative"}>
            <Grid
              item
              xs={12}
              sm={12}
              lg={7}
              xl={8}
              sx={{
                position: "relative",
                "&:before": {
                  content: '""',
                  background: "#e7fdff",
                  backgroundSize: "400% 400%",
                  animation: "gradient 15s ease infinite",
                  position: "absolute",
                  height: "100%",
                  width: "100%",
                  opacity: "1",
                },
              }}
            >
              <Box position="relative">
                <Box px={3} py={3} height={"75px"}>
                  <Logo />
                </Box>
                <Box
                  alignItems="center"
                  justifyContent="center"
                  height={"calc(100vh - 75px)"}
                  sx={{
                    display: {
                      xs: "none",
                      lg: "flex",
                    },
                  }}
                >
                  <Image
                    src={"/images/backgrounds/login_img.png"}
                    alt="bg"
                    width={500}
                    height={400}
                    style={{
                      width: "100%",
                      maxWidth: "500px",
                      maxHeight: "500px",
                    }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid
              item
              xs={12}
              sm={12}
              lg={5}
              xl={4}
              display="flex"
              justifyContent="center"
              alignItems="center"
              position={"relative"}
            >
              <Box p={2} width={lgUp ? "70%" : "100%"}>
                <AuthLogin
                  title="Welcome to MyPanel Dashboard"
                  subtext={
                    <Typography variant="subtitle1" color="textSecondary" mb={1}>
                      Your MyPanel Dashboard
                    </Typography>
                  }
                  subtitle={
                    <Stack direction="row" spacing={1}>
                      <Typography color="textSecondary" variant="h6" fontWeight="500">
                        New to MyPanel?
                      </Typography>
                      <Typography
                        component={Link}
                        href="/register"
                        fontWeight="500"
                        sx={{
                          textDecoration: "none",
                          color: "primary.main",
                        }}
                      >
                        Create an account
                      </Typography>
                    </Stack>
                  }
                />
              </Box>
              {!lgUp && (
                <Box sx={{ textAlign: "center" }} position={"absolute"} bottom={-70}>
                  <Typography>
                    © {currentYear} PrimeCrown Technologies Pvt. Ltd. |{" "}
                    <Typography
                          component={Link}
                          target="_blank"
                          href="https://www.primecrown.com/tos.php"
                          fontWeight="500"
                          sx={{
                              textDecoration: "none",
                              color: "primary.main",
                          }}
                          >
                            Terms of service
                    </Typography>{" "}
                    |{" "}
                    <Typography
                          component={Link}
                          target="_blank"
                          href="https://www.primecrown.com/privacy.php"
                          fontWeight="500"
                          sx={{
                              textDecoration: "none",
                              color: "primary.main",
                          }}
                          >
                            Privacy Policy
                    </Typography>{" "}
                  </Typography>
                </Box>
              )}
            </Grid>
            {lgUp && (
              <Box sx={{ textAlign: "center" }} position={"absolute"} bottom={0}>
                <Typography>
                    © {currentYear} PrimeCrown Technologies Pvt. Ltd. |{" "}
                    <Typography
                          component={Link}
                          target="_blank"
                          href="https://www.primecrown.com/tos.php"
                          fontWeight="500"
                          sx={{
                              textDecoration: "none",
                              color: "primary.main",
                          }}
                          >
                            Terms of service
                    </Typography>{" "}
                    |{" "}
                    <Typography
                          component={Link}
                          target="_blank"
                          href="https://www.primecrown.com/privacy.php"
                          fontWeight="500"
                          sx={{
                              textDecoration: "none",
                              color: "primary.main",
                          }}
                          >
                            Privacy Policy
                    </Typography>{" "}
                  </Typography>
              </Box>
            )}
          </Grid>
        ) : (<Box 
        sx={{ 
          display: "flex", 
          flexDirection: "column", // Change to column
          alignItems: "center", 
          justifyContent: "center", 
          height: "100vh",
          width: "100%", // Ensure full width for centering
        }}
      >
        <CircularProgress size={40} color="primary" />
        <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
          Fetching your account details...
        </Typography>
      </Box>)}
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
      </PageContainer>
    );
  }
}

Login.layout = "Blank";