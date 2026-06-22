"use client"

import React, { useState } from 'react';
import { Divider, Box } from '@mui/material';
import Breadcrumb from '@/app/ui/layout/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/app/ui/components/PageContainer';
import ChatSidebar from '@/app/dashboard/components/chats/ChatSidebar';
import ChatContent from '@/app/dashboard/components/chats/ChatContent';
import ChatMsgSent from '@/app/dashboard/components/chats/ChatMsgSent';
import AppCard from '@/app/dashboard/components/shared/AppCard';
import { useAdminEvents } from '@/app/hooks/useAdminEvents';

const Chats = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  useAdminEvents();

  return (
    <PageContainer title="Chat" description="this is Chat">
      <Breadcrumb title="Chat app" subtitle="Messenger" />
      <AppCard >
        {/* ------------------------------------------- */}
        {/* Left part */}
        {/* ------------------------------------------- */}

        <ChatSidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
        />
        {/* ------------------------------------------- */}
        {/* Right part */}
        {/* ------------------------------------------- */}

        <Box flexGrow={1}>
          <ChatContent toggleChatSidebar={() => setMobileSidebarOpen(true)} />
          <Divider />
          <ChatMsgSent />
        </Box>
      </AppCard>
    </PageContainer>
  );
};

export default Chats;
