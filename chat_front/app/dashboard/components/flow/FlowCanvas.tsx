"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import SaveIcon from "@mui/icons-material/Save";
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  addEdge,
  Connection,
  ReactFlowInstance,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

import StartNode from "./nodes/StartNode";
import StopNode from "./nodes/StopNode";
import HumanNode from "./nodes/HumanNode";
import AiNode from "./nodes/AiNode";
import FormNode from "./nodes/FormNode";
import MegaNode from "./nodes/MegaNode";

import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import Button from "@mui/material/Button";
import DropDownNode from "./nodes/DropDownNode";
import RadioNode from "./nodes/RadioNode";
import CheckboxNode from "./nodes/CheckboxNode";
import SliderNode from "./nodes/SliderNode";
import DateNode from "./nodes/DateNode";
import ButtonNode from "./nodes/ButtonNode";
import DecisionNode from "./nodes/DecisionNode";
import DynamicDecisionNode from "./nodes/DynamicDecisionNode";
import AIPromptNode from "./nodes/AIPromptNode";
import CollectNode from "./nodes/CollectNode";
import InstructionNode from "./nodes/InstructionNode";
import HumanHandoffNode from "./nodes/HumanHandoffNode";

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const nodeTypes = {
  start: StartNode,
  stop: StopNode,
  human: HumanNode,
  ai: AiNode,
  aiPrompt: AIPromptNode,
  form: FormNode,
  mega: MegaNode,
  dropdown: DropDownNode,
  radio: RadioNode,
  checkbox: CheckboxNode,
  slider: SliderNode,
  date: DateNode,
  instruction: InstructionNode,
  human_handoff: HumanHandoffNode,
  button: ButtonNode,
  decision: DecisionNode,
  dynamicDecision: DynamicDecisionNode,
  collect: CollectNode,
};

const FlowCanvas = () => {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  const apiUrl =
    environment === "production"
      ? process.env.NEXT_PUBLIC_API_URL_PRODUCTION
      : environment === "staging"
      ? process.env.NEXT_PUBLIC_API_URL_STAGING
      : process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;

  const searchParams = useSearchParams();
  const widgetId = searchParams.get("widgetId");

  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load flow data
  useEffect(() => {
    if (!widgetId) return;

    fetch(`${apiUrl}/chatpanel/api/widgets/${widgetId}/flow`)
      .then((res) => res.json())
      .then((data) => {
        if (data.flow_json) {
          const loadedNodes = (data.flow_json.nodes || []).map((n: any) => ({
            id: n.id,
            type: n.type || "human",
            position: n.position || { x: 0, y: 0 },
            data: {
              text: n.text || "",
              options: n.options || [],
              fields: n.fields || [],
              time: n.time || 10,
              onChange: (val: any) => {
                setNodes((prev) =>
                  prev.map((node) =>
                    node.id === n.id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            ...(Array.isArray(val) ? { fields: val } : { text: val }),
                          },
                        }
                      : node
                  )
                );
              },
              onDelete: (nodeId: string) => {
                setNodes((nds) => nds.filter((node) => node.id !== nodeId));
                setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
              },
            },
          }));

          const loadedEdges = (data.flow_json.edges || []).map((e: any) => ({
            id: `${e.from}-${e.to}-${e.sourceHandle || ""}`,
            source: e.from,
            target: e.to,
            sourceHandle: e.sourceHandle,
          }));

          setNodes(loadedNodes);
          setEdges(loadedEdges);
        }
      })
      .catch((err) => console.error("Failed to load flow:", err));
  }, [widgetId]);

  // Save flow
  const saveFlow = async () => {
    if (!widgetId) return;
    setIsSaving(true);

    const exportData = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        text: n.data.text,
        options: n.data.options,
        position: n.position,
        time: n.type === "human_handoff" ? (n.data.time || 10) : undefined,
        fields: n.data.fields,
      })),
      edges: edges.map((e) => ({
        from: e.source,
        to: e.target,
        sourceHandle: e.sourceHandle,
      })),
    };

    const instructionIndexes = nodes
      .filter((n) => n.type === "instruction" && n.data?.text)
      .map((n) => ({
        instruction_text: n.data.text,
        index_name: n.data.text,
      }));

    try {
      const response = await fetch(`${apiUrl}/chatpanel/api/widgets/${widgetId}/flow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow_json: exportData,
          indexes: instructionIndexes,
        }),
      });

      if (!response.ok) throw new Error(`Save failed: ${response.statusText}`);
      setSnackbarOpen(true);
    } catch (error) {
      console.error("❌ Failed to save flow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Limit outgoing edges for specific nodes
  const singleEdgeNodeTypes = ["start", "mega","ai", "collect", "human_handoff"];

  const onConnect = useCallback(
  (params: Edge | Connection) => {
    if (!params.source || !params.target) return;

    const sourceId = params.source as string;
    const targetId = params.target as string;

    // ❌ Prevent self-loops
    if (sourceId === targetId) {
      console.warn("⚠️ Self loops are not allowed.");
      return;
    }

    setEdges((eds) => {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      if (!sourceNode) return eds;

      // ❌ Prevent multiple edges from the same sourceHandle
      if (
        params.sourceHandle &&
        eds.some(
          (e) =>
            e.source === sourceId && e.sourceHandle === params.sourceHandle
        )
      ) {
        console.warn(
          `⚠️ Handle "${params.sourceHandle}" of node "${sourceNode.type}" already has a connection.`
        );
        return eds;
      }

      // ❌ Restrict single-edge node types (start, mega, ai, collect, human_handoff)
      if (
        typeof sourceNode.type === "string" &&
        ["start", "mega", "ai", "collect", "human_handoff"].includes(
          sourceNode.type
        )
      ) {
        const hasExisting = eds.some((e) => e.source === sourceId);
        if (hasExisting) {
          console.warn(
            `⚠️ Node "${sourceNode.type}" can only have one outgoing edge.`
          );
          return eds;
        }
      }

      return addEdge(params, eds);
    });
  },
  [nodes]
);


  // Drag & drop
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      const bounds = reactFlowWrapper.current?.getBoundingClientRect?.();
      const type = event.dataTransfer?.getData("application/reactflow");
      if (!type || !bounds || !reactFlowInstance) return;

      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const id = `${+new Date()}`;

      const newNode: Node = {
        id,
        type,
        position,
        data: {
          text: type === "start" ? "Start" : "",
          options: type === "dynamicDecision" ? [""] : undefined,
          fields: type === "collect" ? [] : undefined,
          onChange: (val: any) => {
            setNodes((prev) =>
              prev.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        ...(Array.isArray(val) ? { fields: val } : { text: val }),
                      },
                    }
                  : n
              )
            );
          },
          onDelete: (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
          },
        },
      };

      setNodes((nds) => nds.concat(newNode));
    };

    const wrapper = reactFlowWrapper.current;
    wrapper?.addEventListener("dragover", handleDragOver);
    wrapper?.addEventListener("drop", handleDrop);

    return () => {
      wrapper?.removeEventListener("dragover", handleDragOver);
      wrapper?.removeEventListener("drop", handleDrop);
    };
  }, [reactFlowInstance]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }} ref={reactFlowWrapper}>
      <Button
        onClick={saveFlow}
        variant="contained"
        color="primary"
        disabled={isSaving}
        size="small"
        startIcon={<SaveIcon />}
        sx={{ position: "absolute", top: 10, right: 10, zIndex: 1000 }}
      >
        {isSaving ? "Saving..." : "Save Flow"}
      </Button>

      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          onEdgeClick={(_, edge) => {
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          }}
          onInit={setReactFlowInstance}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="success" sx={{ width: "100%" }}>
          Flow saved successfully!
        </Alert>
      </Snackbar>
    </div>
  );
};

export default FlowCanvas;
