import React, { useState, useEffect } from "react";
import { Handle, Position, useReactFlow, NodeProps } from "reactflow";
import { TextField, Typography, IconButton, Box } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

export default function DynamicDecisionNode({
  id,
  data,
}: NodeProps<{ options?: string[]; onDelete: (id: string) => void }>) {
  const { setNodes } = useReactFlow();

  // ✅ Initialize from data.options (important for reload)
  const [options, setOptions] = useState<string[]>(data?.options || [""]);

  // ✅ Keep node.data.options in sync with local state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, options } } : n
      )
    );
  }, [options, id, setNodes]);

  const addOption = () => setOptions([...options, ""]);

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length === 1) return; // keep at least 1
    setOptions(options.filter((_, i) => i !== index));
  };

  const deleteNode = () => {
    if (data?.onDelete) {
      data.onDelete(id); // use parent-provided delete function
    } else {
      setNodes((nds) => nds.filter((n) => n.id !== id)); // fallback
    }
  };

  return (
    <div
      style={{
        position: "relative",
        background: "#0ea5e9",
        padding: 16,
        borderRadius: 12,
        color: "#fff",
        minWidth: 260,
        textAlign: "center",
        paddingBottom: 30, // Add padding to make room for handles
      }}
    >
      {/* Delete Button */}
      <button
        onClick={deleteNode}
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: "bold",
          padding: 0,
        }}
      >
        ×
      </button>

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        🔀 Multi Decision
      </Typography>

      {/* Entry handle */}
      <Handle type="target" position={Position.Top} id="in" />

      {/* Options list */}
      <Box display="flex" flexDirection="column" gap={2}>
        {options.map((opt, index) => (
          <Box
            key={index}
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={1}
          >
            <TextField
              size="small"
              value={opt}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              sx={{
                input: { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "white" },
                  "&:hover fieldset": { borderColor: "#ddd" },
                },
              }}
              fullWidth
            />

            {/* Remove option */}
            <IconButton
              onClick={() => removeOption(index)}
              size="small"
              sx={{ color: "white" }}
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
          </Box>
        ))}
      </Box>

      {/* Add option */}
      <IconButton
        onClick={addOption}
        size="small"
        sx={{ color: "white", mt: 2 }}
      >
        <AddCircleOutlineIcon />
      </IconButton>

      {/* Output handles */}
      <div
        style={{
          position: "absolute",
          bottom: -6,
          left: 1,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: "24px",
        }}
      >
        {options.map((_, index) => (
          <Handle
            key={index}
            type="source"
            position={Position.Bottom}
            id={`opt-${index}`}
            style={{
              position: "relative",
              transform: "none",
              left: "auto",
              right: "auto",
            }}
          />
        ))}
      </div>
    </div>
  );
}
