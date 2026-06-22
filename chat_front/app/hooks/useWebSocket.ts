import { useEffect, useRef } from "react";

// Generic WebSocket Hook with JSON support and reconnection
export const useWebSocket = <T = any>(
  roomId: string | undefined,
  widgetToken: string | undefined,
  onMessage: (msg: T) => void,
  options?: {
    reconnect?: boolean;
    reconnectInterval?: number;
  }
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!roomId || !widgetToken) return;

    const { reconnect = false, reconnectInterval = 3000 } = options || {};

    const connectWebSocket = () => {
      const ws = new WebSocket(
        `ws://localhost:8000/chatpanel/ws/chat/${widgetToken}/${roomId}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket connected to room: ${roomId} with widget: ${widgetToken}`);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed: T = JSON.parse(event.data);
          onMessage(parsed);
        } catch (err) {
          console.warn("Failed to parse WebSocket message as JSON. Raw data passed.");
          onMessage(event.data as unknown as T);
        }
      };

      ws.onclose = () => {
        console.log("❌ WebSocket closed.");
        if (reconnect) {
          reconnectTimer.current = setTimeout(() => {
            console.log("🔄 Reconnecting WebSocket...");
            connectWebSocket();
          }, reconnectInterval);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
    };
  }, [roomId, widgetToken]);

  const sendMessage = (message: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const data = typeof message === "string" ? message : JSON.stringify(message);
      wsRef.current.send(data);
    } else {
      console.warn("⚠️ WebSocket not ready. Cannot send message.");
    }
  };

  const closeWebSocket = () => {
    wsRef.current?.close();
  };

  return { sendMessage, closeWebSocket };
};
