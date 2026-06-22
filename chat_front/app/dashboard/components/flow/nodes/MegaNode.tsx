import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { TextField, Typography } from "@mui/material";

export default function MegaNode({
  id,
  data,
}: NodeProps<{
  text?: string;
onChange: (value: any) => void;
  onDelete: (id: string) => void;
}>) {
  const { text = "", onChange, onDelete } = data;

  return (
    <div
      style={{
        position: "relative",
        background: "#2563eb",
        padding: 12,
        borderRadius: 10,
        color: "#fff",
        minWidth: 200,
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
        }}
      >
        ×
      </button>

      {/* Label */}
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        📝 Enter Text
      </Typography>

      <TextField
        size="small"
        fullWidth
        value={text}
        onChange={(e) => onChange(e.target.value)} // ✅ only value
        sx={{ background: "#fff", borderRadius: 1 }}
      />

      {/* React Flow Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
