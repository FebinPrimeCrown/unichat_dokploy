'use client'
import React, { useState } from 'react';
import { Box, Button, LinearProgress, Stepper, Step, StepLabel, Typography, CircularProgress } from '@mui/material';
import OrganizationDetailsForm from './OrganizationDetailsForm';
import UserDetailsForm from './UserDetailsForm';
import ReviewDetails from './ReviewDetails';
import { useUser } from '@/app/context/user-context';
import BaseCard from '@/app/ui/components/BaseCard';
import KYCUpload from './KYCBox';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useRouter } from 'next/navigation';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

const steps = ['Organization Details', 'User Details', 'KYC upload', 'Finish'];

const MultiStepFormWizard: React.FC = () => {
  const {user, setUser} = useUser()
  const [activeStep, setActiveStep] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
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

  const handleNext = async () => {
    // const isValid = await validateCurrentStep();
    const isValid = true;
    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async() => {
    console.log("sbm")
    setIsFinished(true);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    try {
      const device_fingerprint = await getClientFingerprint();
      const response = await axios.get(`${apiUrl}/users/kyc_form_finished/`, { withCredentials: true,
        headers: {
          'X-device_fingerprint': device_fingerprint
        }
      });
      setUser(response.data)
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 401) {
            // Token might be expired, attempt to refresh it but before check if the user is in the login page.
            try {
                const device_fingerprint = await getClientFingerprint();
                await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                const response = await axios.get(`${apiUrl}/users/kyc_form_finished/`, { withCredentials: true,
                  headers: {
                    'X-device_fingerprint': device_fingerprint
                  }
                });
                setUser(response.data)
            } catch (error: unknown) {
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
            }
        }
        else{
          await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
          setUser(null);
        } 
    } else {
        console.error('Failed to fetch user:', error);
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        setUser(null);
    }
    }finally{
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <OrganizationDetailsForm onNext={handleNext} />
        );
      case 1:
        return (
          <UserDetailsForm onNext={handleNext} handleBack={handleBack} />
        );
      case 2:
        return (
          <KYCUpload canProceed={canProceed} setCanProceed={setCanProceed} setIsLoading={setIsLoading}/>
        );
      case 3:
        return (
          <ReviewDetails isAgreed={isAgreed} setIsAgreed={setIsAgreed}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <BaseCard>
        <>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ mt: 3 }}>
            <LinearProgress variant="determinate" value={isFinished ? 100 : (activeStep / steps.length) * 100} />
          </Box>
          <Box sx={{ mt: 3 }}>
            {isFinished ? (
              <Typography variant="h6" align="center">
                Thank you for completing the form!
              </Typography>
            ) : (
              getStepContent(activeStep)
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            {activeStep === 3 && !isFinished && (
              <>
                <Button onClick={handleBack} variant="contained">
                  Back
                </Button>
                <Button disabled={!isAgreed} onClick={handleSubmit} variant="contained">
                  Finish
                </Button>
              </>
            )}
            {activeStep === 2 && !isFinished && (
              <>
                <Button onClick={handleBack} variant="contained">
                  Back
                </Button>
                <Button disabled={!canProceed} onClick={handleNext} variant="contained" sx={{width: "150px"}}>
                  {isLoading? <CircularProgress size={20} color="inherit" />: `Next`}
                </Button>
              </>
            )}
          </Box>
        </>
      </BaseCard>
    </Box>
  );
};

export default MultiStepFormWizard;