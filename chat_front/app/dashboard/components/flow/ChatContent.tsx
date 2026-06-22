"use client";
import React from "react";
import { Box, Typography } from "@mui/material";

const ChatContent = ({ flowData }: { flowData: any }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">Flow Preview</Typography>
      <Box sx={{ 
        mt: 2, 
        p: 2, 
        border: "1px dashed #ccc",
        borderRadius: 2
      }}>
        {flowData ? (
          <pre>{JSON.stringify(flowData, null, 2)}</pre>
        ) : (
          <Typography color="text.secondary">
            Build a flow to see preview
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ChatContent;