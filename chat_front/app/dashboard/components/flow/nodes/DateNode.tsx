import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, TextField } from "@mui/material";

export default function DateNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (val: string) => void;
  onDelete: (id: string) => void;
}>) {
  const { text = "", onChange, onDelete } = data;

  return (
    <div
      style={{
        position: "relative",
        background: "#f97316",
        padding: 12,
        borderRadius: 10,
        color: "#fff",
        minWidth: 200,
        zIndex: 10,
      }}
    >
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

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, zIndex: 10 }}>
        📅 Select Date
      </Typography>

      <TextField
        type="date"
        fullWidth
        size="small"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          background: "#fff",
          borderRadius: 1,
          zIndex: 10,
          "& .MuiInputBase-input": {
            zIndex: 10,
          },
        }}
        InputLabelProps={{
          shrink: true,
        }}
      />

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}