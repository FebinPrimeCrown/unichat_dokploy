import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";

export default function RadioNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (val: string) => void;  // ✅ Changed signature
  onDelete: (id: string) => void;
}>) {
  const { text = "", onChange, onDelete } = data;

  return (
    <div
      style={{
        position: "relative",
        background: "#0ea5e9",
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

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        🔘 Choose One
      </Typography>

      <RadioGroup
        value={text}  // ✅ Use text instead of value
        onChange={(e) => onChange(e.target.value)}  // ✅ Single parameter
      >
        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
        <FormControlLabel value="no" control={<Radio />} label="No" />
        <FormControlLabel value="maybe" control={<Radio />} label="Maybe" />
      </RadioGroup>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}