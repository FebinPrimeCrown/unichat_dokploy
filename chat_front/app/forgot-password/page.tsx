"use client"


import { Grid, Box, Typography } from '@mui/material';
import PageContainer from '@/app/ui/components/PageContainer';
import Logo from '@/app/ui/layout/shared/logo/Logo';
import AuthForgotPassword from './AuthForgotPassword';
import Image from 'next/image';

export default function ForgotPassword() {
  return(
  <PageContainer title="Forgot Password Page" description="this is forgot password page">
    <Grid container justifyContent="center" spacing={0} sx={{ overflowX: 'hidden' }}>
      <Grid
        item
        xs={12}
        sm={12}
        lg={8}
        xl={9}
        sx={{
          position: 'relative',
          '&:before': {
            content: '""',
            background: '#e7fdff',
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite',
            position: 'absolute',
            height: '100%',
            width: '100%',
            opacity: '1',
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
            height={'calc(100vh - 75px)'}
            sx={{
              display: {
                xs: 'none',
                lg: 'flex',
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
        lg={4}
        xl={3}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Box p={4}>
          <AuthForgotPassword />
        </Box>
      </Grid>
    </Grid>
  </PageContainer>
)};


ForgotPassword.layout = "Blank";

