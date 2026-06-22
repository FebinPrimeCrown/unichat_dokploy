import PageContainer from '@/app/ui/components/PageContainer';
import { Box } from '@mui/material';
import MultiStepFormWizard from '@/app/ui/components/RegistrationForm';
import { extractRolesFromToken } from '@/app/utils/actions';
import { notFound } from 'next/navigation';


const UserRegistration = async() => {
  let isAdmin = false
  const roles = await extractRolesFromToken()
  if (roles.includes('ga')){
      isAdmin = true
  }
  if (!isAdmin) {
      return notFound(); // ⛔ Show Next.js 404 page
  }
  return (
    <PageContainer title="Registration" description="Registration Wizard Page">
      <Box mt={3}>
        <h1>Hi, Welcome to the Registration Wizard</h1>
        <br />
        <MultiStepFormWizard/>
      </Box>
    </PageContainer>
  );
};

export default UserRegistration;

