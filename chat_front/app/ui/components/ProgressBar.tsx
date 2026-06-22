import { LinearProgress } from '@mui/material';

const ProgressBar = ({ activeStep }: { activeStep: number }) => {
  return (
    <LinearProgress variant="determinate" value={(activeStep / 3) * 100} />
  );
};

export default ProgressBar;