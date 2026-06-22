// app/ui/layout/shared/chat/ChatWidgetLoader.tsx
"use client";

import React, { useEffect, useRef } from "react";

// Fix TypeScript error: window.renderChatWidget does not exist
declare global {
  interface Window {
    renderChatWidget?: (opts?: { container?: HTMLElement }) => void;
  }
}

const ChatWidgetLoader = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = "chat-widget-script";
    const widgetScriptUrl = "http://localhost:53801/chat-widget.iife.js"; // ✅ Change this to your actual URL

    // Only load the script if it hasn't been added yet
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.src = widgetScriptUrl;
      script.id = scriptId;
      script.async = true;

      script.onload = () => {
        if (window.renderChatWidget) {
          window.renderChatWidget({ container: containerRef.current! });
        } else {
          console.error("renderChatWidget is not defined on window.");
        }
      };

      document.body.appendChild(script);
    } else {
      // Script already loaded; just render widget again
      window.renderChatWidget?.({ container: containerRef.current! });
    }
  }, []);

  return <div ref={containerRef} />;
};

export default ChatWidgetLoader;
