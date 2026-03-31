import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import MessageInput from './MessageInput';

export default function ChatWindow() {
  const { currentConversation, messages, typingUsers, onlineUsers } = useChat();
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getDisplayName = (conversation) => {
    if (conversation.isGroup) {
      return conversation.groupName || 'Group Chat';
    }
    const otherUser = conversation.participants?.find((p) => p._id !== user._id);
    return otherUser?.name || 'Unknown';
  };

  const isUserOnline = () => {
    const otherUser = currentConversation?.participants?.find((p) => p._id !== user._id);
    return otherUser && onlineUsers.has(otherUser._id);
  };

  if (!currentConversation) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-600 text-lg font-medium">No conversation selected</p>
          <p className="text-gray-500 text-sm">Select a chat from the list to start messaging</p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {getDisplayName(currentConversation)}
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            {isUserOnline() ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Online
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Offline
              </>
            )}
          </p>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg._id || idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.senderId === user._id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-3 rounded-lg shadow-sm ${
                  msg.senderId === user._id
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.senderId === user._id ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-1"
            >
              <div className="bg-gray-200 px-4 py-2 rounded-lg">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ delay: i * 0.1, duration: 0.6, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-gray-500"
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 self-center">typing...</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput />
    </motion.div>
  );
}