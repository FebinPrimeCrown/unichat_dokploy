import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import FingerprintJS from '@fingerprintjs/fingerprintjs';


async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

interface User {
  email: string;
  full_name: string;
  uuid: string;
  first_name: string
  last_name: string
  telephone_number: string
  organisation_id: number
  organisation: {
    organization_name: string
    street_address: string
    address_line_2: string
    city: string
    country: string
    state: string
    postal_code: string
    type: string
    vat_or_gst_in: string
    currency: string
    kyc_finish_timestamp: string
    kyc_verified_timestamp: string
  }
  kyc_files: KYCFile[];
  domain_handles: DomainHandle[]
  is_group_admin: boolean
  is_first_login?: boolean
  is_admin: boolean
  is_active: boolean
}

interface KYCFile {
  id: number;
  file_name: string;
  file_id: string;
}

interface DomainHandle {
  id: number
  first_name: string
  last_name: string
  telephone_number: string
  city: string
  state: string
  country: string
  street_address: string
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  refetchUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  console.log('User Provider rendering')
  const router = useRouter()
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  console.log(`environment is ${environment}`)
  let apiUrl;
  if (environment === 'production') {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
  } else if (environment === 'staging') {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
  }
  else {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
  }

  const fetchUser = async () => {
    console.log("fetch user")
    try {
      if (user) {
        console.log("user is available")
        return
      }
      if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/admin/approve-fund-confirmation'){
          return;
      }
      const device_fingerprint = await getClientFingerprint();
      const response = await axios.get(`${apiUrl}/users/me/`, { withCredentials: true,
        headers: {
          'X-device_fingerprint': device_fingerprint
        }
      });
      setUser(response.data);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response && error.response.status === 401) {
            // Token might be expired, attempt to refresh it but before check if the user is in the login page.
            if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/admin/approve-fund-confirmation/'){
                return;
            }
            try {
                const device_fingerprint = await getClientFingerprint();
                await axios.post(`${apiUrl}/auth/refresh_access_token`, { device_fingerprint: device_fingerprint }, { withCredentials: true });
                const response = await axios.get(`${apiUrl}/users/me/`, { withCredentials: true,
                  headers: {
                    'X-device_fingerprint': device_fingerprint
                  }
                });
                setUser(response.data);
            } catch (refreshError: unknown) {
                if (axios.isAxiosError(refreshError)) {
                    console.error('Failed to refresh token:', refreshError.response?.data);
                } else {
                    console.error('Failed to refresh token:', refreshError);
                }
                // Handle refresh token failure (e.g., log out the user)
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                setUser(null);
                await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
                router.push('/login')
            }
        } else {
            console.error('Failed to fetch user:', error.response?.data);
            await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
            setUser(null);
        }
    } else {
        console.error('Failed to fetch user:', error);
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        setUser(null);
    }
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    console.log("user available is", user)
    fetchUser();
  }, []);

  const refetchUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider value={{ user, loading, setUser, refetchUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};