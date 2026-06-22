"use client";

import { FlowCanvas, FlowSidebar } from "@/app/dashboard/components/flow";
import { useRouter } from "next/navigation";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box } from "@mui/material";

export default function ChatFlowBuilderPage() {
  const router = useRouter();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Top Bar with Back Button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          flexShrink: 0, // Prevent shrinking
     
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            fontSize: "14px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          <ArrowBackIcon fontSize="small" style={{ marginRight: "4px" }} />
          Back
        </button>
      </Box>

      {/* Main Content - This will take remaining space */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar with fixed width and scrolling */}
        <Box sx={{ width: 240, flexShrink: 0, overflowY: "auto", borderRight: "1px solid #ddd" }}>
          <FlowSidebar />
        </Box>
        
        {/* Canvas area - takes remaining space */}
        <Box sx={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <FlowCanvas />
        </Box>
      </Box>
    </Box>
  );
}