"use client";

import React from 'react';
import ChatSupport from '../../../component/ChatSupport';

/**
 * DashboardChatSupport - A wrapper component for ChatSupport
 * that positions it at the bottom left in the dashboard layout
 */
const DashboardChatSupport = () => {
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '30px', 
        zIndex: 999,
      }}
      className="dashboard-chat-support"
    >
      <style jsx global>{`
        /* Override the default ChatSupport positioning */
        .dashboard-chat-support .chatSupportContainer {
          position: relative;
          bottom: auto;
          right: auto;
        }
      `}</style>
      <ChatSupport />
    </div>
  );
};

export default DashboardChatSupport;
