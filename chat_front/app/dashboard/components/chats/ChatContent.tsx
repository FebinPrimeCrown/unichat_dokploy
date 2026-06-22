import React from "react";
import {
  Typography,
  Divider,
  Avatar,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Box,
  Stack,
  Badge,
  useMediaQuery,
  Theme,
} from "@mui/material";
import {
  IconDotsVertical,
  IconMenu2,
  IconPhone,
  IconVideo,
} from "@tabler/icons-react";
import { useSelector } from "@/app/store/hooks";
import { RootState } from "@/app/store/store";

import { ChatsType } from "@/app/types/apps/chat";
import { formatDistanceToNowStrict } from "date-fns";
import ChatInsideSidebar from "./ChatInsideSidebar";
import Scrollbar from "@/app/dashboard/components/custom-scroll/Scrollbar";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useDispatch } from "@/app/store/hooks";
import { fetchChatMessages } from "@/app/store/apps/chat/ChatSlice";

interface ChatContentProps {
  toggleChatSidebar: () => void;
}

const ChatContent: React.FC<ChatContentProps> = ({ toggleChatSidebar }) => {
  const [open, setOpen] = React.useState(true);
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const parseDate = (dateStr: string) => {
  // If already has timezone (+hh:mm or Z), use as is
  if (dateStr.endsWith("Z") || dateStr.includes("+")) {
    return new Date(dateStr);
  }
  // Otherwise, force UTC by adding Z
  return new Date(dateStr + "Z");
};
  
  const selectedRoomId = useSelector(
    (state: RootState) => state.chatReducer.chatContent
  );

  const chatDetails: ChatsType | undefined = useSelector((state: RootState) =>
    state.chatReducer.chats.find((chat) => chat.room_id === selectedRoomId)
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatDetails?.messages?.length]); // only when msg list updates

  const dispatch = useDispatch();

useEffect(() => {
  if (selectedRoomId) {
    dispatch(fetchChatMessages(selectedRoomId));
  }
}, [selectedRoomId]);

  return (
    <Box>
      {chatDetails ? (
        <Box>
          {/* Header */}
          <Box>
            <Box display="flex" alignItems="center" p={2}>
              <Box
                sx={{
                  display: { xs: "block", md: "block", lg: "none" },
                  mr: "10px",
                }}
              >
                <IconMenu2 stroke={1.5} onClick={toggleChatSidebar} />
              </Box>
              <ListItem key={chatDetails.id} dense disableGutters>
                <ListItemAvatar>
                  <Badge
                    color={
                      chatDetails.status === "online"
                        ? "success"
                        : chatDetails.status === "busy"
                        ? "error"
                        : chatDetails.status === "away"
                        ? "warning"
                        : "secondary"
                    }
                    variant="dot"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    overlap="circular"
                  >
                    <Avatar
                      alt={chatDetails.name}
                      src={chatDetails.thumb}
                      sx={{ width: 40, height: 40 }}
                    />
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="h5">{chatDetails.name}</Typography>
                  }
                  secondary={chatDetails.status}
                />
              </ListItem>
              <Stack direction={"row"}>
                <IconButton aria-label="phone">
                  <IconPhone stroke={1.5} />
                </IconButton>
                <IconButton aria-label="video">
                  <IconVideo stroke={1.5} />
                </IconButton>
                <IconButton aria-label="sidebar" onClick={() => setOpen(!open)}>
                  <IconDotsVertical stroke={1.5} />
                </IconButton>
              </Stack>
            </Box>
            <Divider />
          </Box>

          {/* Chat Content */}
          <Box display="flex">
            <Box width="100%">
              <Box
              ref={scrollRef}
                sx={{
                  height: "650px",
                  overflow: "auto",
                  maxHeight: "800px",
                }}
              >
                <Box p={3}>
                  {chatDetails.messages?.map((chat) => {
                    const isGuest = chat.senderId !== "admin";
                    return (
                      <Box key={chat.id + chat.createdAt}>
                        {isGuest ? (
                          <Box display="flex">
                            <ListItemAvatar>
                              <Avatar
                                alt={chatDetails.name}
                                src={chatDetails.thumb}
                                sx={{ width: 40, height: 40 }}
                              />
                            </ListItemAvatar>
                            <Box>
                              {chat.createdAt && (
                                <Typography
                                  variant="body2"
                                  color="grey.400"
                                  mb={1}
                                >
                                  {chatDetails.name},{" "}
                                  {formatDistanceToNowStrict(
                                    parseDate(chat.createdAt),
                                    { addSuffix: false }
                                  )}{" "}
                                  ago
                                </Typography>
                              )}
                              {chat.type === "text" && (
                                <Box
                                  mb={2}
                                  sx={{
                                    p: 1,
                                    backgroundColor: "grey.100",
                                    mr: "auto",
                                    maxWidth: "320px",
                                  }}
                                >
                                  {chat.msg}
                                </Box>
                              )}
                              {chat.type === "image" && (
                                <Box
                                  mb={1}
                                  sx={{ overflow: "hidden", lineHeight: "0px" }}
                                >
                                  <Image
                                    src={chat.msg}
                                    alt="attach"
                                    width="150"
                                    height="150"
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Box
                            mb={1}
                            display="flex"
                            alignItems="flex-end"
                            flexDirection="row-reverse"
                          >
                            <Box
                              alignItems="flex-end"
                              display="flex"
                              flexDirection="column"
                            >
                              {chat.createdAt && (
                                <Typography
                                  variant="body2"
                                  color="grey.400"
                                  mb={1}
                                >
                                  {formatDistanceToNowStrict(
                                    parseDate(chat.createdAt),
                                    { addSuffix: false }
                                  )}{" "}
                                  ago
                                </Typography>
                              )}
                              {chat.type === "text" && (
                                <Box
                                  mb={1}
                                  sx={{
                                    p: 1,
                                    backgroundColor: "primary.light",
                                    ml: "auto",
                                    maxWidth: "320px",
                                  }}
                                >
                                  {chat.msg}
                                </Box>
                              )}
                              {chat.type === "image" && (
                                <Box
                                  mb={1}
                                  sx={{ overflow: "hidden", lineHeight: "0px" }}
                                >
                                  <Image
                                    src={chat.msg}
                                    alt="attach"
                                    width="250"
                                    height="165"
                                  />
                                </Box>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>

            {/* Sidebar */}
            {open && (
              <Box flexShrink={0}>
                <ChatInsideSidebar
                  isInSidebar={lgUp ? open : !open}
                  chat={chatDetails}
                />
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <Box display="flex" alignItems="center" p={2} pb={1} pt={1}>
          <Box
            sx={{
              display: { xs: "flex", md: "flex", lg: "none" },
              mr: "10px",
            }}
          >
            <IconMenu2 stroke={1.5} onClick={toggleChatSidebar} />
          </Box>
          <Typography variant="h4">Select Chat</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ChatContent;
