import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

export default function StopNode({
  data,
  id,
}: NodeProps<{ 
  label?: string; 
  onDelete: (id: string) => void 
}>) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 20,
        background: "#F44336",
        color: "#fff",
        fontWeight: 600,
        minWidth: 80,
        textAlign: "center",
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
      {data.label || "Stop"}
      
      {/* Handle - Only target since it's an endpoint */}
      <Handle type="target" position={Position.Left} />
    </div>
  );
}