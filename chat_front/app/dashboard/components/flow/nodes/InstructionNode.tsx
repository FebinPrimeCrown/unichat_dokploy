"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";
import { TextField, Typography, Paper, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

type InstructionNodeData = {
  text?: string;
  onChange?: (text: string) => void;
  onDelete?: (id: string) => void;
};

const InstructionNode: React.FC<NodeProps<InstructionNodeData>> = ({
  id,
  data,
}) => {
  const { setNodes } = useReactFlow();
  const [text, setText] = useState(data?.text || "");

  // keep node.data.text in sync
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, text } } : n
      )
    );
  }, [text, id, setNodes]);

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
        backgroundColor: "#e0f2fe", // light blue
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
        x
      </IconButton>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        💬 AI Response / Instruction
      </Typography>

      <TextField
        size="small"
        multiline
        minRows={2}
        placeholder="Enter response or instructions..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        fullWidth
      />

    </Paper>
  );
};

export default InstructionNode;
