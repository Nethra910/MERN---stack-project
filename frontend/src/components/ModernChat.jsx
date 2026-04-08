import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';

export default function ModernChat() {
  const { fetchConversations, currentConversation } = useChat();

  useEffect(() => {
    fetchConversations();
  }, []);

  return (
    <div className="flex h-full bg-white dark:bg-dark-card transition-colors">
      {/* Middle Panel: Conversation List */}
      <div className="w-96 border-r border-gray-200 dark:border-dark-border flex flex-col bg-white dark:bg-dark-card">
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text flex-1">Messages</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-dark-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] focus:bg-white dark:focus:bg-dark-hover transition-all text-sm dark:text-dark-text dark:placeholder:text-dark-muted"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList />
        </div>
      </div>

      {/* Right Panel: Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-bg transition-colors">
        {currentConversation ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-[#DBEAFE] dark:bg-dark-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">💬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                Welcome to Messages
              </h3>
              <p className="text-gray-500 dark:text-dark-muted text-sm">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
