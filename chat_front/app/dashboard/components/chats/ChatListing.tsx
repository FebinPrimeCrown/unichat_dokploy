import React, { useEffect, useState } from "react";
import {
  Avatar,
  List,
  ListItemText,
  ListItemAvatar,
  TextField,
  Box,
  Alert,
  Badge,
  ListItemButton,
  Typography,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";

import { useSelector, useDispatch } from "@/app/store/hooks";
import Scrollbar from "../custom-scroll/Scrollbar";
import {
  setChatContent,
  fetchChats,
  SearchChat,
} from "@/app/store/apps/chat/ChatSlice";

import { ChatsType } from "@/app/types/apps/chat";
import { RootState } from "@/app/store/store";
import { formatDistanceToNowStrict } from "date-fns";
import { last } from "lodash";
import { IconChevronDown, IconSearch } from "@tabler/icons-react";

const ChatListing = () => {
  const dispatch = useDispatch();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const selectedChatRoomId = useSelector(
    (state: RootState) => state.chatReducer.chatContent
  );
  const chatSearch = useSelector(
    (state: RootState) => state.chatReducer.chatSearch || ""
  );
  const chats = useSelector(
    (state: RootState) => state.chatReducer.chats || []
  );

  // ✅ Apply filter + sort by latest activity
  const filteredChats: ChatsType[] = Array.isArray(chats)
    ? [...(chatSearch
        ? chats.filter((c) =>
            c.name.toLowerCase().includes(chatSearch.toLowerCase())
          )
        : chats)
      ].sort((a, b) => {
        const aTime = new Date(
          a.last_active || a.messages?.[a.messages.length - 1]?.createdAt || 0
        ).getTime();
        const bTime = new Date(
          b.last_active || b.messages?.[b.messages.length - 1]?.createdAt || 0
        ).getTime();
        return bTime - aTime;
      })
    : [];

  useEffect(() => {
    dispatch(fetchChats());
  }, [dispatch]);

  const getDetails = (conversation: ChatsType) => {
    const lastMessage = conversation.messages?.length
      ? conversation.messages[conversation.messages.length - 1]
      : null;

    if (lastMessage) {
      const sender = lastMessage.senderId === "admin" ? "You: " : "";
      const message =
        lastMessage.type === "image" ? "Sent a photo" : lastMessage.msg;
      return `${sender}${message}`;
    }

    // fallback from DB if no messages array
    if (conversation.last_message) {
      return conversation.last_message;
    }

    return "";
  };

  const lastActivity = (chat: ChatsType) =>
    chat.messages?.length
      ? last(chat.messages)?.createdAt
      : chat.last_active || null;

  const getStatusColor = (status: string) => {
  switch (status) {
    case "online":
      return "success"; // green
    case "busy":
      return "error"; // red
    case "away":
      return "warning"; // yellow
    case "offline":
      return "warning"; // gray or dim
    default:
      return "secondary";
  }
};


  return (
    <div>
      {/* User Info */}
      <Box display={"flex"} alignItems="center" gap="10px" p={3}>
        <Badge
          variant="dot"
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          overlap="circular"
          color="success"
        >
          <Avatar
            alt="Remy Sharp"
            src="/images/users/1.jpg"
            sx={{ width: 54, height: 54 }}
          />
        </Badge>
        <Box>
          <Typography variant="body1" fontWeight={600}>
            John Deo
          </Typography>
          <Typography variant="body2">Marketing Manager</Typography>
        </Box>
      </Box>

      {/* Search */}
      <Box px={3} py={1}>
        <TextField
          placeholder="Search contacts"
          size="small"
          type="search"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={"16"} />
              </InputAdornment>
            ),
          }}
          fullWidth
          onChange={(e) => dispatch(SearchChat(e.target.value))}
        />
      </Box>

      {/* Menu */}
      <List sx={{ px: 0 }}>
        <Box px={2.5} pb={1}>
          <Button
            id="basic-button"
            aria-controls={open ? "basic-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={handleClick}
            color="inherit"
          >
            Recent Chats <IconChevronDown size="16" />
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{ "aria-labelledby": "basic-button" }}
          >
            <MenuItem onClick={handleClose}>Sort By Time</MenuItem>
            <MenuItem onClick={handleClose}>Sort By Unread</MenuItem>
            <MenuItem onClick={handleClose}>Mark all as Read</MenuItem>
          </Menu>
        </Box>

        {/* Chat List */}
        <Scrollbar
          sx={{
            height: { lg: "calc(100vh - 100px)", md: "100vh" },
            maxHeight: "600px",
          }}
        >
          {Array.isArray(filteredChats) && filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <ListItemButton
                key={chat.id}
                onClick={() => dispatch(setChatContent(chat.room_id))}
                sx={{ mb: 0.5, py: 2, px: 3, alignItems: "start" }}
                selected={selectedChatRoomId === chat.room_id}
              >
                <ListItemAvatar>
                  <Badge
  color={getStatusColor(chat.status)}
  variant="dot"
  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  overlap="circular"
>

                    <Avatar
                      alt={chat.name}
                      src={chat.thumb}
                      sx={{ width: 42, height: 42 }}
                    />
                  </Badge>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Typography variant="subtitle2" fontWeight={600}>
                      {chat.name}
                    </Typography>
                  }
                  secondary={
  chat.isTyping ? "Typing..." : getDetails(chat)
}

                  secondaryTypographyProps={{ noWrap: true }}
                  sx={{ my: 0 }}
                />

                {lastActivity(chat) && (
                  <Box sx={{ flexShrink: "0" }} mt={0.5}>
                    <Typography variant="body2">
                      {formatDistanceToNowStrict(
                        new Date(lastActivity(chat) as string),
                        { addSuffix: false }
                      )}
                    </Typography>
                  </Box>
                )}
              </ListItemButton>
            ))
          ) : (
            <Box m={2}>
              <Alert severity="error" variant="filled" sx={{ color: "white" }}>
                No Contacts Found!
              </Alert>
            </Box>
          )}
        </Scrollbar>
      </List>
    </div>
  );
};

export default ChatListing;
