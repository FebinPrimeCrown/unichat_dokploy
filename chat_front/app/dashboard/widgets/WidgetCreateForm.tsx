"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { useUser } from '@/app/context/user-context';
import { useRouter } from 'next/navigation';

interface WidgetCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

const WidgetCreateForm = ({ onCreated, onCancel }: WidgetCreateFormProps) => {
  const [name, setName] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [specialIndex, setSpecialIndex] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useUser();
  const router = useRouter();

  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const apiUrl =
    environment === 'production'
      ? process.env.NEXT_PUBLIC_API_URL_PRODUCTION
      : environment === 'staging'
      ? process.env.NEXT_PUBLIC_API_URL_STAGING
      : process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;

  async function getClientFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  }

  const handleAddDomain = () => {
    const trimmed = domainInput.trim();
    if (trimmed && !domains.includes(trimmed)) {
      setDomains([...domains, trimmed]);
      setDomainInput('');
    }
  };

  const handleRemoveDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedIndex = specialIndex.trim();

    if (!trimmedName) {
      alert("Please enter a widget name");
      return;
    }
    if (domains.length === 0) {
      alert("Please add at least one domain");
      return;
    }
    if (!trimmedIndex) {
      alert("Please enter the index");
      return;
    }

    setLoading(true);
    try {
      const fingerprint = await getClientFingerprint();

      const res = await fetch(`${apiUrl}/chatpanel/widgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-device_fingerprint': fingerprint,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          allowed_domains: domains,
          special_indexes: [trimmedIndex], // 👈 backend still gets it as array
        }),
      });

      if (res.status === 401) {
        const refreshRes = await fetch(`${apiUrl}/auth/refresh_access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ device_fingerprint: fingerprint }),
        });

        if (refreshRes.ok) {
          const retryRes = await fetch(`${apiUrl}/chatpanel/widgets`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-device_fingerprint': fingerprint,
            },
            credentials: 'include',
            body: JSON.stringify({
              name: trimmedName,
              allowed_domains: domains,
              special_indexes: [trimmedIndex],
            }),
          });

          if (!retryRes.ok) {
            const errorText = await retryRes.text();
            throw new Error(errorText || 'Failed to create widget after token refresh');
          }
        } else {
          await fetch(`${apiUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
          });
          setUser(null);
          router.push('/login');
          return;
        }
      } else if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to create widget");
      }

      // reset form
      setName('');
      setDomains([]);
      setDomainInput('');
      setSpecialIndex('');
      onCreated();

    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box my={4} position="relative">
      <Typography variant="h6" mb={2}>Create New Widget</Typography>
      <Stack spacing={2} maxWidth={400}>

        {/* Widget name */}
        <TextField
          label="Widget Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
        />

        {/* Domains */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Add Allowed Domain *"
            value={domainInput}
            onChange={e => setDomainInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDomain();
              }
            }}
            fullWidth
          />
          <Button
            variant="outlined"
            onClick={handleAddDomain}
            disabled={!domainInput.trim()}
          >
            Add
          </Button>
        </Stack>

        {domains.length > 0 && (
          <Box>
            <Typography variant="caption">Allowed Domains:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {domains.map((domain, idx) => (
                <Chip
                  key={idx}
                  label={domain}
                  onDelete={() => handleRemoveDomain(domain)}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Single Index */}
        <TextField
          label="Primary Domain *"
          value={specialIndex}
          onChange={e => setSpecialIndex(e.target.value)}
          fullWidth
        />

        {/* Buttons */}
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onCancel} fullWidth>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || domains.length === 0 || !specialIndex.trim()}
            fullWidth
          >
            {loading ? 'Creating...' : 'Create Widget'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default WidgetCreateForm;
