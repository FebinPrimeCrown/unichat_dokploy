'use client'
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/context/user-context';
import Link from 'next/link';

const SetupMfaPage = () => {
  const router = useRouter();
  const { user } = useUser(); // Access user context
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  console.log(user?.email, "MFA")

  const handleSetupMfa = async () => {
    try {
      const response = await axios.post('/setup-mfa', { email: user?.email }); // Use the user's email from context
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
    } catch (error) {
      console.error('Error setting up MFA:', error);
    }
  };

  return (
    <div>
      {qrCode ? (
        <div>
          <img src={qrCode} alt="QR Code" />
          <p>Scan this QR code with Google Authenticator or a similar app.</p>
          <p>Save the secret key: {secret}</p>
        </div>
      ) : (
        <button onClick={handleSetupMfa}>Setup MFA</button>
      )}
    </div>
  );
};

export default SetupMfaPage;