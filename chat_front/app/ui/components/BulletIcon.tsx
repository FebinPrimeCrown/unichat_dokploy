// BulletIcon.tsx
import React from "react";
import { SvgIcon, SvgIconProps } from "@mui/material";

const BulletIcon = (props: SvgIconProps) => (
  <SvgIcon {...props} viewBox="0 0 10 10">
    <circle cx="2" cy="2" r="1.5" fill="none" stroke="currentColor" strokeWidth="0.5" />
  </SvgIcon>
);

export default BulletIcon;