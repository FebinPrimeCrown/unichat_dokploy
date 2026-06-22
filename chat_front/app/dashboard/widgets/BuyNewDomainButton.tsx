'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Snackbar, Alert, AlertTitle } from '@mui/material';

export default function BuyNewDomainButton({ canEdit }: { canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    if (!canEdit) {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        color="primary"
        size="large"
        variant="contained"
        onClick={handleClick}
        sx={{ height: 40 }}
      >
        Add New Widget
      </Button>

      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity="error"
          variant='filled'
          sx={{ width: '100%', color: "white" }}
        >
        <AlertTitle>Info</AlertTitle>
        User does not have sufficient privileges to buy new domain.
        </Alert>
      </Snackbar>
    </>
  );
}