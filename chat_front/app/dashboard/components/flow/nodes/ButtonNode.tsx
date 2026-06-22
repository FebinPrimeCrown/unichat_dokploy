import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Typography, Button } from "@mui/material";

export default function ButtonNode({
  id,
  data,
}: NodeProps<{
  text?: string;
  onChange: (val: string) => void;
  onDelete: (id: string) => void;
}>) {
  const { text = "Click Me", onDelete } = data;

  const handleButtonClick = () => {
    alert(`Button clicked! Node ID: ${id}\nButton Text: ${text}`);
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#3b82f6",
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

      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, zIndex: 10 }}>
        🔘 Button Node
      </Typography>

      <Button
        variant="contained"
        fullWidth
        onClick={handleButtonClick} // ✅ Added onClick handler
        sx={{
          backgroundColor: "#fff",
          color: "#3b82f6",
          fontWeight: "bold",
          "&:hover": {
            backgroundColor: "#f0f0f0",
          },
          zIndex: 10,
        }}
      >
        button
      </Button>

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}