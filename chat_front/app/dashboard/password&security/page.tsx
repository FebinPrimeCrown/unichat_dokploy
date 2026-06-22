import React from 'react'
import PageContainer from '@/app/ui/components/PageContainer';
import { Box } from '@mui/material';
import ChangePasswordBox from '@/app/ui/components/ChangePasswordBox';

const PasswordAndSecurityPage = () => {
  return (
    <PageContainer title="Password & Settings" description="Password and Settings page">
      <Box mt={3}>
        <ChangePasswordBox />
      </Box>
    </PageContainer>
  )
}

export default PasswordAndSecurityPage
