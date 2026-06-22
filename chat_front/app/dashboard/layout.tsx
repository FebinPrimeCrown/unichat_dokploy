"use client";
import { styled, Container } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/ui/layout/header/Header";
import Sidebar from "@/app/ui/layout/sidebar/Sidebar";
import Footer from "@/app/ui/layout/footer/page";
import { useUser } from "../context/user-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DetectRefreshToken } from "../utils/actions";
import { usePathname } from 'next/navigation';
import { Box, CircularProgress, Typography } from "@mui/material";
import ChatWidget from '@/app/ui/layout/shared/chat/ChatWidget';


const MainWrapper = styled("div")(() => ({
  display: "flex",
  minHeight: "100vh",
  width: "100%",
}));

const PageWrapper = styled("div")(() => ({
  display: "flex",
  flexGrow: 1,
  paddingBottom: "60px",
  flexDirection: "column",
  zIndex: 1,
  backgroundColor: "transparent",
}));

interface Props {
  children: React.ReactNode;
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter()
  const { user, refetchUser, loading } = useUser();
  console.log(user?.email)
  console.log(loading)
  const pathname = usePathname();

  useEffect(() => {
    // Scroll to the top whenever the pathname changes
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    console.log("dashboard")
    const initializeUser = async () => {
      const refresh_token_present = await DetectRefreshToken()
      if(!refresh_token_present){
        console.log('to login')
        router.push('/login')
      }
      if (!user && !loading) {
        // console.log("from here")
        // await refetchUser();
        console.log('to login')
        router.push('/login')
      }
    };
    initializeUser();
  }, [user]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState('width 0.1s ease-in-out');
  

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
    setTransitionDuration('width 0.1s ease-in-out')
  };

  return (
    <><MainWrapper className="mainwrapper">
      {user ? (
        <>
          {/* ------------------------------------------- */}
          {/* Sidebar */}
          {/* ------------------------------------------- */}
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
            toggleSidebar={toggleSidebar}
            transitionDuration={transitionDuration}
            setTransitionDuration={setTransitionDuration} />
          {/* ------------------------------------------- */}
          {/* Main Wrapper */}
          {/* ------------------------------------------- */}
          <PageWrapper className="page-wrapper"sx={{
          height: "30vh",
        }}>
            {/* ------------------------------------------- */}
            {/* Header */}
            {/* ------------------------------------------- */}
            <Header toggleMobileSidebar={() => setMobileSidebarOpen(true)}
              isSidebarOpen={isSidebarOpen}
              toggleSidebar={toggleSidebar} />

            {/* ------------------------------------------- */}
            {/* PageContent */}
            {/* ------------------------------------------- */}
            <Container
              sx={{
                paddingTop: "20px",
                maxWidth: "1200px",
              }}
            >
              {/* ------------------------------------------- */}
              {/* Page Route */}
              {/* ------------------------------------------- */}
              <Box sx={{ minHeight: "calc(100vh - 170px)" }}>{children}</Box>
              {/* ------------------------------------------- */}
              {/* End Page */}
              {/* ------------------------------------------- */}

              {/* ------------------------------------------- */}
              {/* Footer */}
              {/* ------------------------------------------- */}
              <Footer />
            </Container>
            <ChatWidget widgetToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdhbmlzYXRpb25faWQiOjEsIndpZGdldF9pZCI6MTJ9.M1xEdXarxyjyTwEQKBkHcSJVOZldNN_smriZixgL4qg" />
          </PageWrapper>
        </>
      ) : loading ? (<Box
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
      </Box>) : null}
    </MainWrapper></>
  );
}
