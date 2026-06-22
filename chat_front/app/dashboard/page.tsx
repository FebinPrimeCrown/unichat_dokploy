'use client'
import { Grid, Box, Button, Snackbar, Alert, AlertTitle } from '@mui/material';
import PageContainer from '@/app/ui/components/PageContainer';
// components
import SalesOverview from './components/SalesOverview';
import DailyActivity from './components/DailyActivity';
import ProductPerformance from './components/ProductPerformance';
import BlogCard from './components/Blog';
import { cookies } from 'next/headers';
import Link from 'next/link';
import TopCards from './components/TopCards';
import { useEffect, useState } from 'react';
import { DetectAccessToken, DetectRefreshToken } from '@/app/utils/actions'
import { useUser } from '../context/user-context';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';


async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

const Dashboard = () => {
  const {user, setUser} = useUser()
  const [readyToCallApi, setReadyToCallApi] = useState(false)
  const [forDashboard, setForDashboard] = useState(true)
  const [accountBalanceValue, setAccountBalanceValue] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("")
  const [cardData, setCardData] = useState({
    totalUsers: 0,
    totalProducts: 0,
    newOrders: 0,
    expiringSoon: 0,
  });
  const router = useRouter()
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

  useEffect(() => {
    const fetchDashboardBoxData = async () => {
      // await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
          const device_fingerprint = await getClientFingerprint();
          const response = await axios.get(`${apiUrl}/users/dashboard_boxes_data/`, { withCredentials: true,
            headers: {
              'X-device_fingerprint': device_fingerprint
            }
          });
          return response.data
        } catch (error: unknown) {
          if (axios.isAxiosError(error)) {
            if (error.response && error.response.status === 401) {
                // Token might be expired, attempt to refresh it but before check if the user is in the login page.
                try {
                    const device_fingerprint = await getClientFingerprint();
                    await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                    const response = await axios.get(`${apiUrl}/users/dashboard_boxes_data/`, { withCredentials: true,
                      headers: {
                        'X-device_fingerprint': device_fingerprint
                      }
                    });
                    return response.data
                } catch (error: unknown) {
                    await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                    setUser(null);
                    router.push('/login')
                }
            }
            else{
              await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
              setUser(null);
              router.push('/login')
            }
        } else {
            console.error('Failed to fetch user:', error);
            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
            setUser(null);
            router.push('/login')
        }
        }finally{

        }
  }

  const getData = async () => {
      console.log("called here")
      const data = await fetchDashboardBoxData();
      setAccountBalanceValue(data["account_balance"])
      setCardData({
        totalUsers: data.total_number_of_users,
        totalProducts: data.total_products,
        newOrders: data.new_orders_count,
        expiringSoon: data.expiring_soon_orders_count,
      });
  }

  getData()
}, []);


  return (
    <PageContainer title="Dashboard" description="this is Dashboard">
      <Box mt={3}>
       

        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
  <Box
    sx={{
      backgroundColor: '#f5f5f5',
      height: '100%',
      borderRadius: 2,
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '150px'
    }}
  >
    <strong>Account Balance</strong> (Component Removed)
  </Box>
</Grid>

          <Grid item xs={12} lg={8}>
            <TopCards canCallApi = {readyToCallApi} cardData={cardData}/>
          </Grid>
        </Grid>
      </Box>
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
  )
}

export default Dashboard;
