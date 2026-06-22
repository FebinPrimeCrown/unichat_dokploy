import PageContainer from '@/app/ui/components/PageContainer';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
import { extractRolesFromToken } from '@/app/utils/actions';
import ProfileForm from '@/app/ui/components/ProfileForm';


const UserProfile = async() => {
    console.log("hey")
    let isAdmin = false
    const roles = await extractRolesFromToken()
    if (roles.includes('ga')){
        isAdmin = true
    }

  return (
    <PageContainer title="Profile" description="profile page">
      <Box mt={3}>
        <ProfileForm isAdmin={isAdmin}/>
      </Box>
    </PageContainer>
  );
};

export default UserProfile;

