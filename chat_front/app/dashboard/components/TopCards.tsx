import React from "react";
import { CardContent, Typography, Grid, Avatar, Stack } from "@mui/material";
import {
  IconBox,
  IconChartBar,
  IconRefresh,
  IconUsers,
} from "@tabler/icons-react";
import BlankCard from "./shared/BlankCard";
import { useState, useEffect } from "react";
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import axios from "axios";
import { useUser } from '../../context/user-context';

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get()
  return result.visitorId;
}
type CardDataType = {
  totalUsers: number;
  totalProducts: number;
  newOrders: number;
  expiringSoon: number;

}

const TopCards = ({canCallApi, cardData}:{canCallApi: Boolean, cardData: CardDataType}) => {
  const [isLoading, setIsLoading] = useState(true)
  const {user, setUser} = useUser()

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

const sales = [
  {
    bg: "primary",
    icon: <IconUsers size={24} />,
    digits: cardData.totalUsers,
    subtext: "Users",
    profit: "-9",
    type: "loss",
    key: "1",
  },
  {
    bg: "warning",
    icon: <IconBox size={24} />,
    digits: cardData.totalProducts,
    subtext: "Products",
    profit: "+23",
    type: "profit",
    key: "2",
  },
  {
    bg: "error",
    icon: <IconChartBar size={24} />,
    digits: cardData.newOrders,
    subtext: "New Orders",
    profit: "+38",
    type: "profit",
    key: "3",
  },
  {
    bg: "success",
    icon: <IconRefresh size={24} />,
    digits: cardData.expiringSoon,
    subtext: "Expiring Soon",
    profit: "-12",
    type: "loss",
    key: "4",
  },
];

return(

  <BlankCard>
    <Grid container spacing={0}>
      {sales.map((topcard) => (
        <Grid
          item
          xs={6}
          lg={3}
          sm={3}
          key={topcard.key}
          sx={{
            "&:last-child .MuiCardContent-root": {
              borderRight: "0",
            },
          }}
        >
          <CardContent
            sx={{
              borderRight: {
                xs: "0",
                sm: "1px solid rgba(0,0,0,0.1)",
              },
              height: "230px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center"
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: topcard.bg + ".light",
                color: topcard.bg + ".main",
              }}
            >
              {topcard.icon}
            </Avatar>

            <Stack direction="row" alignItems="center" spacing={1} mt={2}>
              <Typography variant="h3">{topcard.digits}</Typography>
            </Stack>
            <Typography color="textSecondary" variant="h6" fontWeight="400">
              {topcard.subtext}
            </Typography>
          </CardContent>
        </Grid>
      ))}
    </Grid>
  </BlankCard>)
};

export default TopCards;
