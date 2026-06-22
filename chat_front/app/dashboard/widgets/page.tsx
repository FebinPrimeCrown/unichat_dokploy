"use client";

import React, { useState } from 'react';
import { Box, Button, Snackbar, Alert, AlertTitle } from '@mui/material';
import Breadcrumb from '@/app/ui/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/ui/components/PageContainer';
import WidgetList from './WidgetList';
import WidgetCreateForm from './WidgetCreateForm';

const Widgets = () => {
  const [refresh, setRefresh] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const reloadWidgets = () => {
    setRefresh(!refresh);
    setShowForm(false); // Hide form after creation
  };

  // for now, you can adjust permissions as needed
  const canEdit = true; 

  const handleAddClick = () => {
    if (!canEdit) {
      setSnackbarOpen(true);
    } else {
      setShowForm(true);
    }
  };

  return (
    <PageContainer title="Widgets" description="This is widgets">
      <Breadcrumb title="Manage Widgets" subtitle="Widgets" />

      {!showForm ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            color="primary"
            size="large"
            variant="contained"
            onClick={handleAddClick}
            sx={{ height: 40 }}
          >
            Add New Widget
          </Button>
        </Box>
      ) : (
        <WidgetCreateForm 
          onCreated={reloadWidgets} 
          onCancel={() => setShowForm(false)}
        />
      )}

      <WidgetList key={refresh ? '1' : '0'} />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          variant='filled'
          sx={{ width: '100%', color: "white" }}
        >
          <AlertTitle>Info</AlertTitle>
          User does not have sufficient privileges to create widgets.
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

export default Widgets;