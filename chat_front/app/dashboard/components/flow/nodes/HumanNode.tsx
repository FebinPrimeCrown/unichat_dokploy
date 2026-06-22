import { Handle, Position, NodeProps } from "reactflow";

export default function AiNode({
  id,
  data,
}: NodeProps<{ text: string; onChange: (val: string) => void; onDelete: (id: string) => void }>) {
  return (
    <div
      style={{
        position: "relative", // for delete button
        background: "#8b5cf6",
        padding: 10,
        borderRadius: 8,
        color: "#fff",
        minWidth: 120,
      }}
    >
      {/* Delete button */}
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

      {data.text || "Admin"}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
