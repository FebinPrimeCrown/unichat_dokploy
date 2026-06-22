import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, Slider, Box } from "@mui/material";

export default function SliderNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (val: string) => void;
  onDelete: (id: string) => void;
}>) {
  const { text = "50", onChange, onDelete } = data;
  
  // Convert text to number safely
  const numericValue = parseInt(text) || 50;
  
  // Handle slider change
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      onChange(newValue.toString());
    }
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#10b981",
        padding: 16,
        borderRadius: 10,
        color: "#fff",
        minWidth: 220,
        zIndex: 10,
      }}
    >
      {/* Delete Button */}
      <button
        onClick={() => onDelete(id)}
        style={{
          position: "absolute",
          top: -8,
          right: -8,
          width: 24,
          height: 24,
          borderRadius: "50%",
          border: "none",
          background: "#ef4444",
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        ×
      </button>

      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, zIndex: 10, textAlign: "center" }}>
        🎚️ Slider: {numericValue}%
      </Typography>

      <Box sx={{ width: "100%", zIndex: 10, px: 1 }}>
        <Slider
          value={numericValue}
          onChange={handleSliderChange}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value}%`}
          min={0}
          max={100}
          sx={{
            color: "#fff",
            "& .MuiSlider-thumb": {
              backgroundColor: "#fff",
              width: 20,
              height: 20,
              "&:hover": {
                boxShadow: "0px 0px 0px 8px rgba(255, 255, 255, 0.16)",
              },
            },
            "& .MuiSlider-track": {
              border: "none",
              height: 6,
            },
            "& .MuiSlider-rail": {
              backgroundColor: "#ccc",
              opacity: 0.5,
              height: 6,
            },
            "& .MuiSlider-valueLabel": {
              backgroundColor: "#10b981",
              color: "#fff",
              borderRadius: 2,
              padding: "4px 8px",
              fontSize: 12,
              fontWeight: "bold",
              "&:before": {
                display: "none",
              },
            },
          }}
        />
      </Box>

      {/* React Flow Handles */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: "#10b981", width: 10, height: 10 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: "#10b981", width: 10, height: 10 }} 
      />
    </div>
  );
}