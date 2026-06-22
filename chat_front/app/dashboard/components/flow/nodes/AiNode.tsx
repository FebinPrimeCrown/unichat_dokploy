import { Handle, Position, NodeProps } from "reactflow";
import React from "react";

export default function AiNode({
  data,
  id,
}: NodeProps<{ text: string; onChange: (val: string) => void; onDelete: (id: string) => void }>) {
  return (
    <div
      style={{
        background: "#34d44cff",
        padding: 10,
        borderRadius: 8,
        color: "#fff",
        minWidth: 120,
        position: "relative", // needed for delete button
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

      {/* Node Text */}
      <div>{data.text || "AI Response"}</div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
