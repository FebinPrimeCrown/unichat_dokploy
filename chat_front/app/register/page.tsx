"use client";
import Link from "next/link";
import { Grid, Box, Typography, Stack, useMediaQuery } from "@mui/material";
import PageContainer from "@/app/ui/components/PageContainer";
import Logo from '@/app/ui/layout/shared/logo/Logo';
import AuthRegister from "./AuthRegister";
import Image from "next/image";
import { useState, useEffect } from "react";


export default function Register() {
  const [mounted, setMounted] = useState(false);
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const currentYear = new Date().getFullYear();

  useEffect(()=>{
    setMounted(true);
  }, [])

  if(!mounted){
    return null;
  }

  return (
  <PageContainer title="Register Page" description="this is Sample page">
    <Grid
      container
      spacing={0}
      justifyContent="center"
      sx={{ overflowX: "hidden" }}
      position={"relative"}
    >
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
              alt="bg" width={500} height={400}
              style={{
                width: "100%",
                maxWidth: "500px",  maxHeight: '500px',
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
        <Box p={2} mb={10} width={lgUp === true ? "70%" : "100%"}>
          <AuthRegister
            title="Welcome to MyPanel Dashboard"
            subtext={
              <Typography variant="subtitle1" color="textSecondary" mb={1}>
                Your MyPanel Dashboard
              </Typography>
            }
            subtitle={
              <Stack direction="row" spacing={1} mt={3}>
                <Typography color="textSecondary" variant="h6" fontWeight="400">
                  Already have an Account?
                </Typography>
                <Typography
                  component={Link}
                  href="/login"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Sign In
                </Typography>
              </Stack>
            }
          />
        </Box>
        {!lgUp && <Box sx={{textAlign: "center" }} position={"absolute"} bottom={0}>
            <Typography>
              © {currentYear} PrimeCrown Technologies Pvt. Ltd. |{" "}
              <Typography
                  component={Link}
                  href="https://www.primecrown.com/tos.php"
                  target="_blank"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Terms of service
                </Typography>{" "} | {" "}<Typography
                  component={Link}
                  href="https://www.primecrown.com/privacy.php"
                  target="_blank"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Privacy Policy
                </Typography>{" "}
            </Typography>
        </Box>}
      </Grid>
      {lgUp && <Box sx={{textAlign: "center" }} position={"absolute"} bottom={0}>
            <Typography>
              © {currentYear} PrimeCrown Technologies Pvt. Ltd. |{" "}
              <Typography
                  component={Link}
                  href="https://www.primecrown.com/tos.php"
                  target="_blank"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Terms of service
                </Typography>{" "} | {" "}<Typography
                  component={Link}
                  href="https://www.primecrown.com/privacy.php"
                  target="_blank"
                  fontWeight="500"
                  sx={{
                    textDecoration: "none",
                    color: "primary.main",
                  }}
                >
                  Privacy Policy
                </Typography>{" "}
            </Typography>
        </Box>}
    </Grid>
  </PageContainer>
)};

