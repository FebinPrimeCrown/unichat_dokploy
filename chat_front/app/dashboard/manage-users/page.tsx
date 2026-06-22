import PageContainer from '@/app/ui/components/PageContainer';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button } from '@mui/material';
import { extractRolesFromToken } from '@/app/utils/actions';
import Table from '@/app/ui/components/manage-users/table';
import { notFound } from 'next/navigation';


const ManageUsers = async() => {
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
    <PageContainer title="Manage Users" description="Manage user page">
      <Box>
          <h2 style={{fontWeight: "700"}}>User Management</h2>
          <h6 style={{"color": "silver"}}>An overview of your users</h6>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              color="primary"
              size="large"
              component={Link}
              variant='contained'
              href="/dashboard/add-user"
            >
              Add User
            </Button>
        </Box>
          {<Table />}
      </Box>
    </PageContainer>
  );
};

export default ManageUsers;