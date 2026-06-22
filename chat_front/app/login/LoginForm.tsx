'use client';
import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import '@mdi/font/css/materialdesignicons.min.css';
import "./style.css"
import {z} from 'zod'
import { useSearchParams } from 'next/navigation';
import { useUser } from '../context/user-context';
import { useEffect } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { DetectRefreshToken } from '../utils/actions';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}


const FormSchema = z.object({
    email: z.string()
              .min(1, { message: 'Enter your email address' }),
    password: z.string().min(1, { message: 'Enter your password' })
  });

type ValidationErrors = {
    email?: string;
    password?: string;
};


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const next_page_url = searchParams.get('next');
  const {user, refetchUser} = useUser();
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
  console.log(user?.email)
  
  console.log("login rendered")

    useEffect(() => {
        console.log("login usereffect")
        const checkRefreshToken = async () => {
        try {
            const refresh_token_present = await DetectRefreshToken();
            if (refresh_token_present && user) {
            if (next_page_url) {
                router.push(next_page_url);
            } else {
                router.push('/dashboard');
            }
            }
        } catch (error) {
            console.error('Error checking refresh token:', error);
        }
        };

        checkRefreshToken();
    }, [user]);


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const device_fingerprint = await getClientFingerprint();
    console.log(device_fingerprint)
    try {
        const validatedFields = FormSchema.parse({
            email: email,
            password: password
        });
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('device_fingerprint', device_fingerprint)
        const response = await axios.post(
            `${apiUrl}/auth/token`,
            formData,
            {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            withCredentials: true,
            }
        );

        if (response.status === 200) {
            await refetchUser();
            if(user){
            if (next_page_url){
                router.push(next_page_url);
            }
            else {
              router.push('/dashboard');
            }
          }
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: {[key: string]: string} = {};
          error.errors.forEach((err) => {
            fieldErrors[err.path[0]] = err.message;
          });
          setValidationErrors(fieldErrors);
        } else {
          setError('Invalid email or password');
        }
      }
  };

  return (
    <div className='main'>
    <div className="container">
      <div className="row">
        <div className="col-md-5 mx-auto" style={{"paddingTop": "5%"}}>
          <div className="myform form">
            <div className="logo mb-3">
              <div className="col-md-12 text-center">
                <h1 style={{"fontSize": "1.875rem"}}>Login</h1>
              </div>
            </div>
            {error && <div className="a-box-inner a-alert-container">
                <i className="mdi mdi-alert"></i>
                <h4 className="a-alert-heading">There was a problem</h4>
                <p className="a-list-item">Invalid email or password</p>
            </div>}
            <div className="card">
              <div className="card-body" style={{"padding": "30px 30px"}}>
                <h4 className="card-title" style={{"fontSize": "21px"}}>Login to Dashboard</h4>
                <h5 className="card-subtitle mb-3 pb-3 border-bottom" style={{"fontSize": "1rem", "color": "#777e89"}}>
                  Login to an Existing Account
                </h5>
                <form onSubmit={handleLogin}>
                  <div className="form-floating mb-3">
                    <input
                      type="email"
                      name="email"
                      className="form-control border border-danger"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <label>
                      <i className="mdi mdi-email-outline feather-sm text-danger fill-white me-2"></i>
                      <span className="border-start border-danger ps-3">Email address</span>
                    </label>
                    {validationErrors.email && !email && <div className="text-danger">{validationErrors.email}</div>}
                  </div>
                  <div className="form-floating mb-3">
                    <input
                      type="password"
                      name="password"
                      className="form-control border border-danger"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <label>
                      <i className="mdi mdi-lock-outline feather-sm text-danger fill-white me-2"></i>
                      <span className="border-start border-danger ps-3">Password</span>
                    </label>
                    {validationErrors.password && !password && <div className="text-danger">{validationErrors.password}</div>}
                  </div>
                  <div className="d-md-flex align-items-center">
                    <button type="submit" className="btn font-weight-medium rounded-pill px-4 login-button">
                      <div className="d-flex align-items-center">
                        <i className="mdi mdi-send feather-sm fill-white me-2"></i><span className='login-text'>Login</span>
                      </div>
                    </button>
                  </div>
                </form>
                <h4 className="mt-4 or-divider text-center mb-3 or-button">
                  <span className="position-relative bg-white px-3">OR</span>
                </h4>
                <div className="row justify-content-center">
                  <div className="col-lg-12 mb-2 mb-md-0">
                    <a href="#" className="google-button align-items-center justify-content-center btn btn-outline-danger w-100">
                      <i className="mdi mdi-google ri-google-fill me-2 fs-6"></i> Login with Google
                    </a>
                  </div>
                </div>
                <div className="form-group">
                  <br />
                  <p className="text-center" style={{"color": "#777e89"}}>Don't have account? <a href="#" id="signup">Sign up here</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}