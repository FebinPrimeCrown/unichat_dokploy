"use client";

import React from "react";
import { Box, Typography, Paper } from "@mui/material";

// Import icons from @mui/icons-material
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import DescriptionIcon from "@mui/icons-material/Description";
import ArrowDropDownCircleIcon from "@mui/icons-material/ArrowDropDownCircle"; // for dropdown
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked"; // for radio
import CheckBoxIcon from "@mui/icons-material/CheckBox"; // for checkbox
import DateRangeIcon from "@mui/icons-material/DateRange";
import SliderIcon from "@mui/icons-material/Tune";
import ButtonIcon from "@mui/icons-material/RadioButtonChecked";
import CallSplitIcon from "@mui/icons-material/CallSplit"; // for decision node
import DoneIcon from '@mui/icons-material/Done';
import AssignmentIcon from "@mui/icons-material/Assignment"; // for CollectNode



const SidebarItem = ({
  icon,
  label,
  type,
  color,
  onDragStart,
}: {
  icon: React.ElementType;
  label: string;
  type: string;
  color?: "primary" | "secondary" | "error" | "info" | "success" | "warning";
  onDragStart: (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => void;
}) => (
  <Paper
    onDragStart={(e) => onDragStart(e, type)}
    draggable
    elevation={3}
    sx={{
      p: 2,
      mb: 2,
      display: "flex",
      alignItems: "center",
      cursor: "grab",
      borderRadius: 2,
      transition: "0.2s",
      "&:hover": {
        boxShadow: 6,
        backgroundColor: "#fafafa",
      },
    }}
  >
    <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
      {React.createElement(icon, { fontSize: "small", color })}
    </Box>
    <Typography variant="subtitle2">{label}</Typography>
  </Paper>
);

const FlowSidebar = () => {
  const onDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    nodeType: string
  ) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Box
      sx={{
      width: "100%",
      height: "100%", // Take full height of parent
      display: "flex",
      flexDirection: "column",
      background: "#f9f9f9",
    }}
    >
      <Box sx={{ p: 2, borderBottom: "1px solid #ddd", flexShrink: 0 }}>
      <Typography variant="h6" fontWeight={600}>
        Flow Components
      </Typography>
    </Box>

<Box
      sx={{
        flex: 1,
        overflowY: "auto", // Enable scrolling
        p: 2,
      }}
    >
      {/* Node Types with colored icons */}
      <SidebarItem
        icon={PlayCircleOutlineIcon}
        label="Start"
        type="start"
        color="success"
        onDragStart={onDragStart}
      />
      <SidebarItem
  icon={SmartToyIcon}   // or DescriptionIcon, whichever fits better
  label="AI Response / Instruction"
  type="instruction"    // 👈 this must match the node type you register in React Flow
  color="info"
  onDragStart={onDragStart}
/>

      <SidebarItem
  icon={AssignmentIcon}
  label="Collect"
  type="collect"
  color="info"
  onDragStart={onDragStart}
/>
<SidebarItem
  icon={PersonOutlineIcon}
  label="Human Handoff"
  type="human_handoff"
  color="error"
  onDragStart={onDragStart}
/>


      <SidebarItem
        icon={PersonOutlineIcon}
        label="Human"
        type="human"
        color="info"
        onDragStart={onDragStart}
      />
      <SidebarItem
        icon={SmartToyIcon}
        label="AI"
        type="ai"
        color="secondary"
        onDragStart={onDragStart}
      />
      <SidebarItem
        icon={DescriptionIcon}
        label="Form"
        type="form"
        color="warning"
        onDragStart={onDragStart}
      />
      <SidebarItem
  icon={SmartToyIcon}   // you can pick a new icon if you want
  label="Mega"
  type="mega"
  color="error"
  onDragStart={onDragStart}
/>
<SidebarItem
  icon={SmartToyIcon} // or use a different icon like PsychologyIcon
  label="AI Prompt"
  type="aiPrompt"
  color="secondary"
  onDragStart={onDragStart}
/>
{/* <SidebarItem
        icon={ArrowDropDownCircleIcon}
        label="Dropdown"
        type="dropdown"
        color="primary"
        onDragStart={onDragStart}
      /> */}
      {/* <SidebarItem
        icon={RadioButtonCheckedIcon}
        label="Radio"
        type="radio"
        color="success"
        onDragStart={onDragStart}
      /> */}
      {/* <SidebarItem
        icon={CheckBoxIcon}
        label="Checkbox"
        type="checkbox"
        color="warning"
        onDragStart={onDragStart}
      /> */}
      {/* <SidebarItem
  icon={SliderIcon}
  label="Slider"
  type="slider"
  color="success"
  onDragStart={onDragStart}
/> */}
{/* <SidebarItem
  icon={DateRangeIcon}
  label="Date"
  type="date"
  color="warning"
  onDragStart={onDragStart}
/> */}
{/* <SidebarItem
  icon={ButtonIcon}
  label="Button"
  type="button"
  color="primary"
  onDragStart={onDragStart}
/> */}
{/* <SidebarItem
  icon={CallSplitIcon}
  label="Decision"
  type="decision"
  color="secondary"
  onDragStart={onDragStart}
/> */}
<SidebarItem
  icon={CallSplitIcon} // or another suitable icon
  label="Dynamic Decision"
  type="dynamicDecision" // 👈 this is the important type string
  color="error"
  onDragStart={onDragStart}
/>
<SidebarItem
  icon={DoneIcon} // You'll need to import StopIcon from @mui/icons-material
  label="Stop"
  type="stop"
  color="error"
  onDragStart={onDragStart}
/>


    </Box>
    </Box>
  );
};

export default FlowSidebar;
