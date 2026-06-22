"use client";

import React, { useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Box, TextField, IconButton, Typography, Paper } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";

type CollectField = {
  variable: string;
  label: string;
  value: string;
};

type CollectNodeData = {
  fields?: CollectField[];
  onChange?: (fields: CollectField[]) => void;
  onDelete?: (id: string) => void;
};

const CollectNode: React.FC<NodeProps<CollectNodeData>> = ({ id, data }) => {
  const [fields, setFields] = useState<CollectField[]>(
    data.fields || [{ variable: "", label: "", value: "" }]
  );

  const updateField = (index: number, key: keyof CollectField, value: string) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
    if (data.onChange) data.onChange(newFields);
  };

  const addField = () => {
    setFields([...fields, { variable: "", label: "", value: "" }]);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
    if (data.onChange) data.onChange(newFields);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        borderRadius: 2,
        minWidth: 250,
        backgroundColor: "#fdfdfd",
        position: "relative",
      }}
    >
      {/* Delete button */}
      {data.onDelete && (
        <IconButton
          onClick={() => data.onDelete!(id)}
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
          ×
        </IconButton>
      )}

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Collect Data
      </Typography>

      {fields.map((field: CollectField, index: number) => (
        <Box key={index} display="flex" flexDirection="column" mb={2}>
          <TextField
            size="small"
            label="Variable"
            placeholder={`var${index + 1}`}
            value={field.variable}
            onChange={(e) => updateField(index, "variable", e.target.value)}
            sx={{ mb: 1 }}
          />
          <TextField
            size="small"
            label="Question / Label"
            placeholder="Enter your question"
            value={field.label}
            onChange={(e) => updateField(index, "label", e.target.value)}
            sx={{ mb: 1 }}
          />
          <Box display="flex" justifyContent="flex-end">
            <IconButton size="small" onClick={() => removeField(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ))}

      <Box display="flex" justifyContent="flex-start">
        <IconButton color="primary" onClick={addField}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>

      {/* Flow handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
};

export default CollectNode;
