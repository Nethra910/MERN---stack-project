import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import UserSearch from './UserSearch';

export default function ConversationList() {
  const { conversations, currentConversation, setCurrentConversation, fetchMessages, onlineUsers, loading } = useChat();
  const [searchOpen, setSearchOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation._id);
  };

  const getDisplayName = (conversation) => {
    if (conversation.isGroup) {
      return conversation.groupName || 'Group Chat';
    }
    const otherUser = conversation.participants?.find((p) => p._id !== user._id);
    return otherUser?.name || 'Unknown';
  };

  const isUserOnline = (conversation) => {
    if (conversation.isGroup) return false;
    const otherUser = conversation.participants?.find((p) => p._id !== user._id);
    return otherUser && onlineUsers.has(otherUser._id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">💬 Messages</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 hover:bg-white rounded-lg transition"
          >
            ✏️
          </motion.button>
        </div>

        {/* Search Input */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: searchOpen ? 'auto' : 0, opacity: searchOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <input
            type="text"
            placeholder="Search or start new chat..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
          />
        </motion.div>
      </motion.div>

      {/* User Search Component */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-gray-100"
          >
            <UserSearch onClose={() => setSearchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-400"
            >
              <div className="text-center">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p>Loading conversations...</p>
              </div>
            </motion.div>
          ) : conversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-gray-400 p-4"
            >
              <div className="text-5xl mb-3">📭</div>
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Click ✏️ to start a new chat</p>
            </motion.div>
          ) : (
            conversations.map((conversation, idx) => (
              <motion.div
                key={conversation._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelectConversation(conversation)}
                className={`p-3 cursor-pointer transition-all border-b border-gray-50 hover:bg-gray-50 ${
                  currentConversation?._id === conversation._id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-gray-800 truncate">
                    {getDisplayName(conversation)}
                  </p>
                  {isUserOnline(conversation) && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-green-500"
                    />
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conversation.lastMessage || 'No messages yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(conversation.lastMessageTime).toLocaleDateString()}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}