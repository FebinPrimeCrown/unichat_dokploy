'use client'
import React from 'react'
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Button, IconButton } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Link from 'next/link';
import { useState } from 'react';
import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useUser } from '@/app/context/user-context';
import { useRouter } from 'next/navigation';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}

type VirtualMachine = {
  id: string;
  vm_id: string
  vm_name: string;
  vm_hostname: string;
  vm_ip_address: string;
  vm_status: string;
};

const Operations = ({onMoreClick}: {onMoreClick: () => void}) => {
  const [loading, setLoading] = useState(false);
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
  const router = useRouter()
  const {user, setUser} = useUser()
  
  return (
    <div style={{display: "flex", alignItems: "center"}}>
        <Button
          style={{textDecoration: "none", "color": "white"}}
          variant='contained'
          onClick={onMoreClick}
        >
          Edit
        </Button>
    </div>
  )
}

export default Operations
