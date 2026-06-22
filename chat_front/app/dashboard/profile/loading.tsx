'use client';
import {
  Paper,
  Grid,
  Stack,
  Skeleton,
  Box
} from '@mui/material';
import BaseCard from '@/app/ui/components/BaseCard';

const ProfileFormSkeleton = () => {
  return (
    <Box mt={3}>
      <BaseCard title="Organisation Details" animateTitle={true}>
        <form>
          <Stack spacing={0}>
            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
            </Grid>
          </Stack>
          <br />
          <Skeleton variant="rectangular" height={40} width={100} />
        </form>
      </BaseCard>

      <br />
      <br />

      <BaseCard title="User Details" animateTitle={true}>
        <form>
          <Stack spacing={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Skeleton variant="text" height={56} />
              </Grid>
            </Grid>
          </Stack>
          <br />
          <Skeleton variant="rectangular" height={40} width={100} />
        </form>
      </BaseCard>

      <br />
      <br />

      <BaseCard title="KYC section" animateTitle={true}>
        <Skeleton variant="rectangular" height={200} />
      </BaseCard>
    </Box>
  );
};

export default ProfileFormSkeleton;