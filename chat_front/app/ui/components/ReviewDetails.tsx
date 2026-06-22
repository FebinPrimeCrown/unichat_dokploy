import React from 'react';
import { useUser } from '@/app/context/user-context';
import {
  Paper,
  Grid,
  Stack,
  TextField,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormLabel,
  FormControl,
  Button,
  Box,
  Checkbox
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface reviewProps {
  setIsAgreed: (value: boolean) => void;
  isAgreed: boolean;
}

const ReviewDetails = ({isAgreed, setIsAgreed}: reviewProps) => {
  const {user, setUser} = useUser()

  return (
      <div>
        <h4>Organisation Details</h4>
        <hr style={{"backgroundColor": "silver", "height": "1px", "border": "none"}}/>
        <Grid container spacing={2}>
          {user?.organisation.type === 'business' && (<Grid item xs={12} md={6}>
            <div>
              <strong>Organisation Name: </strong>{user?.organisation.organization_name}
            </div>
          </Grid>)}
          {user?.organisation.type === 'business' && (<Grid item xs={12} md={6}>
            <div>
              <strong>VAT/GST IN: </strong>{user?.organisation.vat_or_gst_in}
            </div>
          </Grid>)}
          <Grid item xs={12} md={6}>
            <div>
              <strong>Organisation Type: </strong>{user?.organisation.type}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Street Address:</strong> {user?.organisation.street_address}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Address Line 2:</strong> {user?.organisation.address_line_2}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Postal Code:</strong> {user?.organisation.postal_code}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>City:</strong> {user?.organisation.city}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>State:</strong> {user?.organisation.state}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Country:</strong> {user?.organisation.country}
            </div>
          </Grid>
        </Grid>
        <br />
        <h4>User Details</h4>
        <hr style={{"backgroundColor": "silver", "height": "1px", "border": "none"}}/>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <div>
              <strong>First Name:</strong> {user?.first_name}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Last Name:</strong> {user?.last_name}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Telephone Number:</strong> {user?.telephone_number}
            </div>
          </Grid>
          <Grid item xs={12} md={6}>
            <div>
              <strong>Email:</strong> {user?.email}
            </div>
          </Grid>
        </Grid>
        <br />
        <h4>KYC uploads</h4>
        <hr style={{"backgroundColor": "silver", "height": "1px", "border": "none"}}/>
        <Grid container spacing={2}>
          {user?.kyc_files?.map((file, index) => (
            <Grid item xs={12} key={index}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <CheckCircleIcon style={{ color: "green", marginRight: "8px" }} />
                <span>uploaded {file.file_name}</span>
              </div>
            </Grid>
          ))}
        </Grid>
        <br></br>
        <Box sx={{display: 'flex', justifyContent: "flex-start"}}>
          <FormControlLabel
            control={<Checkbox checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} />}
            label="I agree to the Service Agreement and Terms of Service."
          />
        </Box>
      </div>
  );
};

export default ReviewDetails;