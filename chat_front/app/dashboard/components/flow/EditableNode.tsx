"use client";

import React from "react";
import { Handle, Position, NodeProps, useReactFlow } from "reactflow";

const EditableNode = ({ data, id }: NodeProps) => {
  const { deleteElements } = useReactFlow();

  return (
    <div style={{ position: "relative", paddingTop: 20 }}>
      {/* ❌ Delete Button - OUTSIDE top right */}
      <button
  onClick={() => deleteElements({ nodes: [{ id }] })}
  style={{
    position: "absolute",
    top: -1,
    right: 2, // shifted more to the left
    zIndex: 10,
    background: "transparent",
    border: "none",
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    cursor: "pointer",
    lineHeight: 1,
  }}
  title="Delete Node"
>
  ×
</button>


      {/* 📦 Node UI */}
      <div
        style={{
          padding: 8,
          border: "1px solid #aaa",
          borderRadius: 6,
          background: "#fefefe",
          minWidth: 160,
          maxWidth: 200,
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.label}</div>

        <textarea
          value={data.text}
          onChange={(e) => data.onChange?.(e.target.value)}
          placeholder="Type here..."
          style={{
            width: "100%",
            minHeight: 40,
            maxHeight: 60,
            fontSize: 12,
            resize: "none",
            padding: 4,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
          rows={2}
        />

        {/* 🔌 Handles */}
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: "#555",
            width: 10,
            height: 10,
            borderRadius: "50%",
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: "#555",
            width: 10,
            height: 10,
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
};

export default EditableNode;
