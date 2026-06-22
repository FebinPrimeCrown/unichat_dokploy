import React from "react";
import { Handle, Position } from "reactflow";

export default function StartNode({ data }: { data: { label?: string } }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 20,
        background: "#4CAF50",
        color: "#fff",
        fontWeight: 600,
        minWidth: 80,
        textAlign: "center"
      }}
    >
      {data.label || "Start"}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
