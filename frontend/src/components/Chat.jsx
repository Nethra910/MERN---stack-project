import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';

function ChatContent() {
  const { fetchConversations, loading } = useChat();

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-[calc(100vh-120px)] bg-gray-50 overflow-hidden"
    >
      {/* Conversation List Sidebar */}
      <motion.div
        initial={{ x: -400 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm"
      >
        <ConversationList />
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        <ChatWindow />
      </div>
    </motion.div>
  );
}

export default function Chat() {
  // ChatProvider is already in App.jsx
  return <ChatContent />;
}