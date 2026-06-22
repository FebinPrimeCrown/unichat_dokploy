"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { Paper, Box, Typography, TextField, IconButton } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import DeleteIcon from "@mui/icons-material/Delete";

type HumanHandoffNodeData = {
  text?: string; // ✅ use same as InstructionNode
  onChange?: (val: string) => void;
  onDelete?: (id: string) => void;
};

const HumanHandoffNode: React.FC<NodeProps<HumanHandoffNodeData>> = ({
  id,
  data,
}) => {
  const { setNodes } = useReactFlow();
  const [fallback, setFallback] = useState(data?.text || ""); // ✅ use data.text

  // keep node.data.text in sync
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, text: fallback } } : n
      )
    );
  }, [fallback, id, setNodes]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFallback(e.target.value);
    if (data?.onChange) data.onChange(e.target.value);
  };

  const deleteNode = () => {
    if (data?.onDelete) {
      data.onDelete(id);
    } else {
      setNodes((nds) => nds.filter((n) => n.id !== id));
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        minWidth: 250,
        backgroundColor: "#fff3f3",
        border: "1px solid #f28b82",
        position: "relative",
      }}
    >
      {/* Delete button */}
      <IconButton
        onClick={deleteNode}
        sx={{
          position: "absolute",
          top: -10,
          right: -10,
          backgroundColor: "#ef4444",
          color: "#fff",
          width: 24,
          height: 24,
          "&:hover": { backgroundColor: "#dc2626" },
        }}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>

      {/* Header */}
      <Box display="flex" alignItems="center" mb={1}>
        <PersonOutlineIcon color="error" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={600} ml={1}>
          Human Handoff
        </Typography>
      </Box>

      {/* Static Subheading */}
      <Typography variant="body2" sx={{ mb: 1 }}>
        Fallback: No human available in 3 minutes
      </Typography>

      {/* Textbox to edit fallback message */}
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={2}
        placeholder="Enter fallback message..."
        value={fallback}
        onChange={handleChange}
      />

      {/* Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
};

export default HumanHandoffNode;
