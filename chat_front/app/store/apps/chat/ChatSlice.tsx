import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import { ChatsType, MessageType } from "@/app/types/apps/chat";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
let apiUrl;
if (environment === 'production') {
  apiUrl = process.env.NEXT_PUBLIC_API_URL_PRODUCTION;
} else if (environment === 'staging') {
  apiUrl = process.env.NEXT_PUBLIC_API_URL_STAGING;
} else {
  apiUrl = process.env.NEXT_PUBLIC_API_URL_DEVELOPMENT;
}

async function getClientFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

// 🔁 Async thunk to fetch chat list
export const fetchChats = createAsyncThunk("chat/fetchChats", async (_, thunkAPI) => {
  const fingerprint = await getClientFingerprint();

  const fetchData = async () => {
    return axios.get(`${apiUrl}/chatpanel/api/list`, {
      withCredentials: true,
      headers: {
        "X-device_fingerprint": fingerprint,
      },
    });
  };

  try {
    const response = await fetchData();
    return response.data as ChatsType[];
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      try {
        await axios.post(
          `${apiUrl}/auth/refresh_access_token`,
          { device_fingerprint: fingerprint },
          { withCredentials: true }
        );
        const retryResponse = await fetchData();
        return retryResponse.data as ChatsType[];
      } catch (refreshError) {
        await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
        console.error("❌ Token refresh failed, user logged out.");
        return thunkAPI.rejectWithValue("Unauthorized");
      }
    } else {
      console.error("⚠️ fetchChats failed:", error);
      throw error;
    }
  }
});

// 🔁 Async thunk to fetch messages
export const fetchChatMessages = createAsyncThunk(
  "chat/fetchChatMessages",
  async (room_id: string, { rejectWithValue }) => {
    const makeRequest = async (fingerprint: string) => {
      return axios.get(`${apiUrl}/chatpanel/api/messages/${room_id}`, {
        withCredentials: true,
        headers: {
          "X-device_fingerprint": fingerprint,
        },
      });
    };

    try {
      const fingerprint = await getClientFingerprint();
      const response = await makeRequest(fingerprint);
      return { room_id, messages: response.data as MessageType[] };
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          const fingerprint = await getClientFingerprint();
          await axios.post(
            `${apiUrl}/auth/refresh_access_token`,
            { device_fingerprint: fingerprint },
            { withCredentials: true }
          );
          const response = await makeRequest(fingerprint);
          return { room_id, messages: response.data as MessageType[] };
        } catch (refreshError) {
          await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true });
          return rejectWithValue("Unauthorized. Logged out.");
        }
      }
      return rejectWithValue("Failed to fetch messages.");
    }
  }
);

interface ChatState {
  chats: ChatsType[];
  chatContent: string;
  chatSearch: string;
}

const initialState: ChatState = {
  chats: [],
  chatContent: "",
  chatSearch: "",
};

const ChatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChats: (state, action: PayloadAction<ChatsType[]>) => {
      state.chats = action.payload;
    },

    setChatContent: (state, action: PayloadAction<string>) => {
      state.chatContent = action.payload;
    },

    typingStatusUpdated: (state, action) => {
  const { room_id, typing } = action.payload;
  const chat = state.chats.find((c) => c.room_id === room_id);
  if (chat) {
    chat.isTyping = typing;
  }
},


    sendMsg: (
      state,
      action: PayloadAction<{ room_id: string; msg: MessageType }>
    ) => {
      const { room_id, msg } = action.payload;
      const chat = state.chats.find((c) => c.room_id === room_id);
      if (chat) {
        chat.messages = [...(chat.messages || []), msg];
      }
    },

    receiveMsg: (
      state,
      action: PayloadAction<{ room_id: string; msg: MessageType }>
    ) => {
      const { room_id, msg } = action.payload;
      const chatIndex = state.chats.findIndex(chat => chat.room_id === room_id);

      console.log("📩 [receiveMsg] MQTT payload:", msg);

      if (chatIndex !== -1) {
        const existingChat = state.chats[chatIndex];

        const updatedChat = {
          ...existingChat,
          messages: [...(existingChat.messages || []), msg],
          last_active: msg.createdAt,
          last_message: msg.msg,
        };

        state.chats = [
          updatedChat,
          ...state.chats.filter((_, i) => i !== chatIndex),
        ];
        console.log("✅ [receiveMsg] Updated existing chat:", updatedChat);
      } else {
        const newChat: ChatsType = {
          id: Date.now(),
          name: "Guest User",
          room_id,
          thumb: "/images/profile/user-1.jpg",
          status: "online",
          messages: [msg],
          last_active: msg.createdAt,
          last_message: msg.msg,
        };
        state.chats.unshift(newChat);
        console.log("🆕 [receiveMsg] Added new guest chat:", newChat);
      }

      console.log("🧾 [receiveMsg] Final chat state:", state.chats);
    },

    SearchChat: (state, action: PayloadAction<string>) => {
      state.chatSearch = action.payload;
    },

    updateGuestStatus: (state, action) => {
  const { room_id, status } = action.payload;
  const chat = state.chats.find((c) => c.room_id === room_id);
  if (chat) {
    chat.status = status; // directly assign 'online' or 'offline'
  }
},


  

    addNewGuest: (state, action: PayloadAction<ChatsType>) => {
      const exists = state.chats.find(
        (chat) => chat.room_id === action.payload.room_id
      );
      if (!exists) {
        state.chats.unshift(action.payload);
      }
    },
  },

  extraReducers: (builder) => {
    builder.addCase(fetchChats.fulfilled, (state, action) => {
      const incomingChats = action.payload;
      console.log("🔄 [fetchChats.fulfilled] Incoming chats:", incomingChats);

      incomingChats.forEach((incomingChat) => {
        const existingIndex = state.chats.findIndex(
          (c) => c.room_id === incomingChat.room_id
        );

        if (existingIndex !== -1) {
          const existing = state.chats[existingIndex];
          state.chats[existingIndex] = {
            ...existing,
            ...incomingChat,
            messages: existing.messages || [],
          };
        } else {
          state.chats.push({
            ...incomingChat,
            messages: [],
          });
        }
      });

      state.chats.sort((a, b) => {
        const aTime = new Date(a.last_active || 0).getTime();
        const bTime = new Date(b.last_active || 0).getTime();
        return bTime - aTime;
      });

      console.log("✅ [fetchChats.fulfilled] Final merged chat state:", state.chats);
    });

    builder.addCase(fetchChatMessages.fulfilled, (state, action) => {
      const { room_id, messages } = action.payload;
      const chat = state.chats.find((c) => c.room_id === room_id);
      if (chat) {
        chat.messages = messages;
      }
    });
  },
});

export const {
  setChats,
  setChatContent,
  sendMsg,
  receiveMsg,
  typingStatusUpdated,
  updateGuestStatus,
  SearchChat,
  addNewGuest,
} = ChatSlice.actions;

export default ChatSlice.reducer;
