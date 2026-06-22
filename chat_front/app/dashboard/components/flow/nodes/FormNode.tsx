import { Handle, Position, NodeProps } from "reactflow";

export default function FormNode({
  id,
  data,
}: NodeProps<{ text: string; onChange: (val: string) => void; onDelete: (id: string) => void }>) {
  return (
    <div
      style={{
        position: "relative", // for delete button
        background: "#f59e0b",
        padding: 10,
        borderRadius: 8,
        color: "#fff",
        minWidth: 140,
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

      {data.text || "Form Input"}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
