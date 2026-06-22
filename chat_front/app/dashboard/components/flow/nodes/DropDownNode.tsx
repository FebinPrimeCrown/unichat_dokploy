"use client";

import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, Select, MenuItem } from "@mui/material";

export default function DropDownNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (field: string, value: any) => void;
  onDelete: (id: string) => void;
}>) {
  const { text = "option1", onChange, onDelete } = data;

  return (
    <div
      style={{
        position: "relative",
        background: "#9333ea",
        padding: 12,
        borderRadius: 10,
        color: "#fff",
        minWidth: 200,
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
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "none",
          background: "#ef4444",
          color: "#fff",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        ×
      </button>

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        🔽 Pick an Option
      </Typography>

      <Select
        fullWidth
        size="small"
        value={text}
        onChange={(e) => onChange("text", e.target.value)} // ✅ consistent signature
        sx={{
          background: "#fff",
          borderRadius: 1,
        }}
        MenuProps={{
          disableScrollLock: true,
          container: document.body, // ✅ ensures dropdown attaches to <body>
          PaperProps: {
            style: { zIndex: 9999 },
          },
        }}
      >
        <MenuItem value="option1">Option 1</MenuItem>
        <MenuItem value="option2">Option 2</MenuItem>
        <MenuItem value="option3">Option 3</MenuItem>
      </Select>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
