import PageContainer from '@/app/ui/components/PageContainer';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button } from '@mui/material';
import { extractRolesFromToken } from '@/app/utils/actions';
import CreateUserForm from '@/app/ui/components/add-user/add-user';
import { notFound } from 'next/navigation';


const AddUser = async() => {
    console.log("hey")
    let isAdmin = false
    const roles = await extractRolesFromToken()
    if (roles.includes('ga')){
        isAdmin = true
    }
    if (!isAdmin) {
        return notFound(); // ⛔ Show Next.js 404 page
    }

  return (
    <PageContainer title="Add user" description="Add user page">
      <Box>
        <CreateUserForm/>
      </Box>
    </PageContainer>
  );
};

export default AddUser;
