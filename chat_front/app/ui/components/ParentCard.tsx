'use client'
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Divider from '@mui/material/Divider';

type Props = {
  title: string;
  footer?: string | JSX.Element;
  codeModel?: JSX.Element | JSX.Element[];
  children: JSX.Element;
};

const ParentCard = ({ title, children, footer, codeModel }: Props) => {

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <Card
      sx={{ padding: 0, border: `1px solid ${borderColor}` }}
      elevation={9}
      variant={'outlined'}
    >
      <CardHeader title={title} action={codeModel} />
      <Divider />

      <CardContent>{children}</CardContent>
      {footer ? (
        <>
          <Divider />
          <Box p={3}>{footer}</Box>
        </>
      ) : (
        ''
      )}
    </Card>
  );
};

export default ParentCard;
