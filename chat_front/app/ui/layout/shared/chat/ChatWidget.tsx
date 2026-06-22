"use client";
import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import { jwtDecode } from "jwt-decode";

interface ChatMessage {
  senderId: string;
  msg: string;
  type: string;
  createdAt: string;
}

interface TypingEvent {
  event: "typing";
  room_id: string;
  typing: boolean;
  senderId: string;
}

interface DecodedToken {
  organisation_id: number;
  widget_id: number;
}

const ChatWidget = ({ widgetToken }: { widgetToken: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [clickedOptions, setClickedOptions] = useState<Set<string>>(new Set());
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const decoded: DecodedToken = jwtDecode(widgetToken);
  const organisationId = decoded.organisation_id;

  // ✅ Use persistent senderId
  const [senderId] = useState(() => {
    const stored = localStorage.getItem("guest_sender_id");
    if (stored) return stored;
    const newId = `guest-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("guest_sender_id", newId);
    return newId;
  });

  const roomId = senderId;

  // 🟢 Load chat from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`chat_messages_${roomId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch (e) {
        console.error("❌ Failed to parse saved messages:", e);
      }
    }
  }, [roomId]);

  // 🟢 Save chat to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_messages_${roomId}`, JSON.stringify(messages));
    }
  }, [messages, roomId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const extractOptionsFromMessage = (msg: string): string[] => {
    const choosePattern = /Please choose:\s*(.+)/i;
    const match = msg.match(choosePattern);
    if (match && match[1]) {
      return match[1].split(",").map((opt) => opt.trim()).filter((opt) => opt.length > 0);
    }
    return [];
  };

  // ✅ Reset flow when widget loads (optional)
  useEffect(() => {
    fetch("http://localhost:8000/chatpanel/api/chat/reset_flow", {
      method: "POST",
      body: new URLSearchParams({ room_id: roomId }),
    })
      .then((res) => res.json())
      .then((data) => console.log("🔄 Flow reset:", data))
      .catch((err) => console.error("❌ Reset flow failed:", err));
  }, [roomId]);

  // ✅ MQTT setup
  useEffect(() => {
    const mqttClient = mqtt.connect("ws://localhost:9001", {
      will: {
        topic: `admin/${organisationId}`,
        payload: JSON.stringify({
          event: "offline",
          room_id: roomId,
          senderId,
          online: false,
        }),
      },
    });

    mqttClient.on("connect", () => {
      console.log("🟢 MQTT connected");
      mqttClient.subscribe(`guest/${roomId}`, (err) => {
        if (!err) {
          console.log(`📡 Subscribed to guest/${roomId}`);
          const onlinePayload = { event: "online", room_id: roomId, senderId };
          mqttClient.publish(`admin/${organisationId}`, JSON.stringify(onlinePayload));
        }
      });
    });

    mqttClient.on("message", (topic, payload) => {
      try {
        const parsed = JSON.parse(payload.toString());

        if ((parsed.message || parsed).type === "human_handoff") {
          const handoffMsg: ChatMessage = {
            senderId: "bot",
            msg: "⏳ Please wait, connecting you to a human agent...",
            type: "text",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, handoffMsg]);
          setIsResponding(false);
          return;
        }

        const msg: ChatMessage = parsed.message || parsed;
        if (msg && msg.senderId) {
          setMessages((prev) => [...prev, msg]);
          setIsResponding(false);

          if (msg.senderId === "bot") {
            const options = extractOptionsFromMessage(msg.msg);
            if (options.length > 0) setClickedOptions(new Set());
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse MQTT message:", err);
      }
    });

    setClient(mqttClient);

    return () => {
      const offlinePayload = {
        event: "offline",
        room_id: roomId,
        senderId,
        online: false,
      };
      mqttClient.publish(`admin/${organisationId}`, JSON.stringify(offlinePayload));
      mqttClient.end();
    };
  }, [roomId]);

  const handleTyping = (value: string) => {
    setInput(value);
    if (client?.connected) {
      const typingPayload: TypingEvent = {
        event: "typing",
        room_id: roomId,
        typing: true,
        senderId,
      };
      client.publish(`admin/${organisationId}`, JSON.stringify(typingPayload));
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      if (client?.connected) {
        const stopTypingPayload: TypingEvent = {
          event: "typing",
          room_id: roomId,
          typing: false,
          senderId,
        };
        client.publish(`admin/${organisationId}`, JSON.stringify(stopTypingPayload));
      }
    }, 1000);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const message: ChatMessage = {
      senderId,
      msg: textToSend,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, message]);
    if (!messageText) setInput("");
    setIsResponding(true);

    try {
      await fetch("http://localhost:8000/chatpanel/api/chat/send", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new URLSearchParams({
          widget_token: widgetToken,
          room_id: roomId,
          senderId: message.senderId,
          msg: message.msg,
          type: message.type,
          createdAt: message.createdAt,
        }),
      });
    } catch (err) {
      console.error("❌ Failed to send:", err);
      setIsResponding(false);
    }
  };

  const handleOptionClick = (option: string) => {
    setClickedOptions((prev) => new Set(prev).add(option));
    handleSend(option);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        background: "#fff",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 16,
        width: 300,
        height: 400,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        zIndex: 9999,
      }}
    >
      <h4 style={{ marginBottom: 8 }}>Chat ({senderId})</h4>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: 10,
          padding: "8px",
          backgroundColor: "#f9f9f9",
          borderRadius: 4,
        }}
      >
        {messages.map((msg, idx) => {
          const options = msg.senderId === "bot" ? extractOptionsFromMessage(msg.msg) : [];
          const displayMessage = options.length > 0 ? msg.msg.replace(/Please choose:.+$/i, "Please choose:") : msg.msg;

          return (
            <div key={idx} style={{ marginBottom: 10 }}>
              <strong>{msg.senderId}:</strong>
              <div>{displayMessage}</div>

              {options.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                  {options.map((option, optIdx) => {
                    const isClicked = clickedOptions.has(option);
                    return (
                      <button
                        key={optIdx}
                        onClick={() => !isClicked && handleOptionClick(option)}
                        disabled={isClicked}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: isClicked ? "#e0e0e0" : "#f0f0f0",
                          border: "1px solid #ccc",
                          borderRadius: 4,
                          cursor: isClicked ? "not-allowed" : "pointer",
                          textAlign: "left",
                          fontSize: "12px",
                          color: isClicked ? "#888" : "#000",
                          opacity: isClicked ? 0.7 : 1,
                        }}
                      >
                        {option}
                        {isClicked && " ✓"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {isResponding && <div style={{ color: "#888", fontStyle: "italic" }}>Admin is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
};

export default ChatWidget;
