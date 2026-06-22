"use client";
import React from "react";
import { useEffect} from 'react'
import { IconButton, InputBase, Box, Popover } from "@mui/material";
import {
  IconMoodSmile,
  IconPaperclip,
  IconPhoto,
  IconSend,
} from "@tabler/icons-react";
import EmojiPicker, {
  EmojiStyle,
  EmojiClickData,
  Emoji,
} from "emoji-picker-react";

import { useSelector, useDispatch } from "@/app/store/hooks";
import { ChatsType, MessageType } from "@/app/types/apps/chat";
import { RootState } from "@/app/store/store";
import { sendMsg } from "@/app/store/apps/chat/ChatSlice";
import axios from "axios";


const ChatMsgSent = () => {
  const dispatch = useDispatch();
  const [msg, setMsg] = React.useState<string>("");
  const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(
    null
  );
  const [chosenEmoji, setChosenEmoji] = React.useState<string>("");
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
  let apiUrl;
  if (environment === 'production') {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION; // Set your production URL
  } else if (environment === 'staging') {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING; // Use the staging URL or development URL
  }
  else {
    apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
  }
  // ✅ Get selected chat
  const selectedRoomId = useSelector(
    (state: RootState) => state.chatReducer.chatContent
  );
  const chatDetails: ChatsType | undefined = useSelector((state: RootState) =>
    state.chatReducer.chats.find((chat) => chat.room_id === selectedRoomId)
  );

  useEffect(() => {
    setMsg(""); // Clear message box when changing chat
  }, [selectedRoomId]);
  // ✅ Emoji selection
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setChosenEmoji(emojiData.unified);
    setMsg((prev) => prev + emojiData.emoji);
  };

  const handleChatMsgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(e.target.value);
  };

  const handleEmojiPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const onChatMsgSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!msg.trim() || !chatDetails) return;

    const newMsg: MessageType = {
      id: Date.now().toString(),
      type: "text",
      msg: msg.trim(),
      createdAt: new Date().toISOString(),
      senderId: "admin",
      attachment: [],
    };

    try {
      // ✅ Send using FormData to `/api/chat/send`
      const form = new FormData();
      form.append("senderId", String(newMsg.senderId)); // Convert to string
      form.append("msg", newMsg.msg);
      form.append("type", newMsg.type);
      form.append("createdAt", newMsg.createdAt);
      form.append("widget_token", chatDetails.widget_token ?? ""); // Fallback if undefined
      form.append("room_id", chatDetails.room_id);

      await axios.post(`${apiUrl}/chatpanel/api/chat/send`, form);

      // ✅ Update Redux
      dispatch(sendMsg({ room_id: chatDetails.room_id, msg: newMsg }));

      setMsg("");
      setChosenEmoji("");
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  if (!chatDetails) {
    return (
      <Box p={2}>
        <em>⚠️ Select a chat to start messaging</em>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <form
        onSubmit={onChatMsgSubmit}
        style={{ display: "flex", gap: "10px", alignItems: "center" }}
      >
        <IconButton onClick={handleEmojiPopover}>
          <IconMoodSmile />
        </IconButton>

        <Popover
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClosePopover}
          anchorOrigin={{ horizontal: "right", vertical: "top" }}
          transformOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <EmojiPicker onEmojiClick={onEmojiClick} />
          <Box p={2}>
            Selected:{" "}
            {chosenEmoji ? (
              <Emoji
                unified={chosenEmoji}
                emojiStyle={EmojiStyle.APPLE}
                size={22}
              />
            ) : (
              "None"
            )}
          </Box>
        </Popover>

        <InputBase
          fullWidth
          value={msg}
          placeholder="Type a message"
          onChange={handleChatMsgChange}
          inputProps={{ "aria-label": "Type a message" }}
        />

        <IconButton type="submit" disabled={!msg.trim()} color="primary">
          <IconSend stroke={1.5} size={20} />
        </IconButton>

        <IconButton>
          <IconPhoto stroke={1.5} size={20} />
        </IconButton>
        <IconButton>
          <IconPaperclip stroke={1.5} size={20} />
        </IconButton>
      </form>
    </Box>
  );
};

export default ChatMsgSent;
