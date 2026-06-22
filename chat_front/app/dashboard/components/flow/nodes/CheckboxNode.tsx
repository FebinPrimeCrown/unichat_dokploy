import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, FormGroup, FormControlLabel, Checkbox } from "@mui/material";

export default function CheckboxNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (val: string) => void;  // ✅ Changed signature
  onDelete: (id: string) => void;
}>) {
  const { text = "", onChange, onDelete } = data;

  // For checkboxes, you might want to store multiple values as a comma-separated string
  const selectedValues = text ? text.split(',') : [];

  const toggle = (val: string) => {
    const newSelectedValues = selectedValues.includes(val)
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val];
    
    onChange(newSelectedValues.join(','));  // ✅ Store as comma-separated string
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#f59e0b",
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
        ☑️ Select Options
      </Typography>

      <FormGroup>
        <FormControlLabel
          control={<Checkbox checked={selectedValues.includes("a")} onChange={() => toggle("a")} />}
          label="Option A"
        />
        <FormControlLabel
          control={<Checkbox checked={selectedValues.includes("b")} onChange={() => toggle("b")} />}
          label="Option B"
        />
        <FormControlLabel
          control={<Checkbox checked={selectedValues.includes("c")} onChange={() => toggle("c")} />}
          label="Option C"
        />
      </FormGroup>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}