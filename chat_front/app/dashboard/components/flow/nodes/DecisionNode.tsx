import React from "react";
import { Handle, Position } from "reactflow";
import { Typography } from "@mui/material";

export default function DecisionNode({ id, data }: any) {
  return (
    <div
      style={{
        position: "relative",
        background: "#0ea5e9",
        padding: 12,
        borderRadius: 10,
        color: "#fff",
        minWidth: 180,
        textAlign: "center",
      }}
    ><button
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
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
        🔀 Decision
      </Typography>

      {/* Entry handle */}
      <Handle type="target" position={Position.Top} id="in" />

      {/* Exit handles (True / False) */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <div style={{ textAlign: "left" }}>
          <Typography variant="caption">True</Typography>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: 40 }} />
        </div>
        <div style={{ textAlign: "right" }}>
          <Typography variant="caption">False</Typography>
          <Handle type="source" position={Position.Bottom} id="false" style={{ right: 40 }} />
        </div>
      </div>
    </div>
  );
}
