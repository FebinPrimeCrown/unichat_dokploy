import { Handle, Position, NodeProps } from "reactflow";
import React from "react";

export default function AIPromptNode({
  data,
  id,
}: NodeProps<{ 
  prompt: string; 
  onChange: (val: string) => void; 
  onDelete: (id: string) => void 
}>) {
  return (
    <div
      style={{
        background: "#6A0DAD", // Purple color for prompt nodes
        padding: 15,
        borderRadius: 8,
        color: "#fff",
        minWidth: 200,
        position: "relative",
      }}
    >
      {/* Delete Button */}
      <button
        onClick={() => data.onDelete(id)}
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
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        ×
      </button>

      {/* Node Header */}
      <div style={{ fontWeight: "bold", marginBottom: 10, fontSize: "14px" }}>
        AI System Prompt
      </div>

      {/* Text Area for Prompt */}
      <textarea
        value={data.prompt}
        onChange={(e) => data.onChange(e.target.value)}
        placeholder="You are a sales development representative... (e.g., You are helpful, friendly, and focused on converting leads)"
        style={{
          width: "100%",
          minHeight: "80px",
          padding: "8px",
          borderRadius: "4px",
          border: "none",
          background: "#fff",
          color: "#000",
          fontSize: "12px",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />

      {/* Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}