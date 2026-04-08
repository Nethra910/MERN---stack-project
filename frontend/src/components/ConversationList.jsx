import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import UserSearch from './UserSearch';

export default function ConversationList() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { 
    conversations, currentConversation, setCurrentConversation, fetchMessages, 
    onlineUsers, loading, unreadCounts, fetchUnreadCounts, markConversationAsRead,
    pinConversation, unpinConversation
  } = useChat();
  const [searchOpen, setSearchOpen] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // ✅ FIX: Login stores user with 'id' (not '_id'), so check both
  const currentUserId = String(user?.id || user?._id || '');

  // Fetch unread counts on mount
  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation._id);
    // Mark as read when selecting
    if (unreadCounts[conversation._id]) {
      markConversationAsRead(conversation._id);
    }
    navigate(`/messages/chat/${conversation._id}`);
  };

  const isPinned = (conversation) => {
    return conversation.pinnedBy?.some(p => String(p.userId) === currentUserId);
  };

  const handlePinToggle = (e, conversation) => {
    e.stopPropagation();
    if (isPinned(conversation)) {
      unpinConversation(conversation._id);
    } else {
      pinConversation(conversation._id);
    }
  };

  // Sort conversations: pinned first, then by lastMessageTime
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aPinned = isPinned(a);
      const bPinned = isPinned(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });
  }, [conversations, currentUserId]);

  const getOtherUser = (conversation) => {
    if (!conversation?.participants?.length) return null;
    return conversation.participants.find((p) => String(p?._id) !== currentUserId) || null;
  };

  const getDisplayName = (conversation) => {
    if (conversation.isGroup) {
      return conversation.groupName || 'Group Chat';
    }
    const otherUser = getOtherUser(conversation);
    return otherUser?.name || otherUser?.fullName || otherUser?.username || 'Unknown';
  };

  const isUserOnline = (conversation) => {
    if (conversation.isGroup) return false;
    const otherUser = getOtherUser(conversation);
    if (!otherUser?._id) return false;
    return onlineUsers.has(String(otherUser._id));
  };

  const formatConversationDate = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card transition-colors">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-4 border-b border-gray-100 dark:border-dark-border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-dark-hover dark:to-dark-card"
      >
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-dark-text">💬 Messages</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 hover:bg-white dark:hover:bg-dark-hover rounded-lg transition"
          >
            ✏️
          </motion.button>
        </div>

        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: searchOpen ? 'auto' : 0, opacity: searchOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <input
            type="text"
            placeholder="Search or start new chat..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-sm bg-white dark:bg-dark-bg dark:text-dark-text"
          />
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-gray-100 dark:border-dark-border"
          >
            <UserSearch onClose={() => setSearchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-full text-gray-400 dark:text-dark-muted"
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
              className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-dark-muted p-4"
            >
              <div className="text-5xl mb-3">📭</div>
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Click ✏️ to start a new chat</p>
            </motion.div>
          ) : (
            sortedConversations.map((conversation, idx) => {
              // Fix: user from localStorage has 'id', not '_id'
              const otherParticipant = conversation.participants?.find(p => String(p._id) !== String(currentUserId));
              const profilePic = otherParticipant?.profilePicture;
              const displayName = getDisplayName(conversation);
              const unreadCount = unreadCounts[conversation._id] || 0;
              const pinned = isPinned(conversation);
              
              return (
                <motion.div
                  key={conversation._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-3 cursor-pointer transition-all border-b border-gray-50 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover group relative ${
                    String(chatId || currentConversation?._id) === String(conversation._id)
                      ? 'bg-[#DBEAFE] dark:bg-blue-900/20 border-l-4 border-[#2563EB]'
                      : ''
                  } ${pinned ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                >
                  {/* Pin indicator */}
                  {pinned && (
                    <div className="absolute top-1 right-1">
                      <Pin className="w-3 h-3 text-amber-500" fill="currentColor" />
                    </div>
                  )}

                  {/* Pin button (on hover) */}
                  <button
                    onClick={(e) => handlePinToggle(e, conversation)}
                    className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      pinned 
                        ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover'
                    }`}
                    title={pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-3.5 h-3.5" fill={pinned ? 'currentColor' : 'none'} />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {profilePic ? (
                        <img
                          src={profilePic}
                          alt={displayName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(displayName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      {isUserOnline(conversation) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-card rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-medium truncate ${unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-dark-text'}`}>
                          {displayName}
                        </p>
                        {unreadCount > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-2 min-w-[20px] h-5 px-1.5 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </motion.span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${unreadCount > 0 ? 'text-gray-700 dark:text-dark-text font-medium' : 'text-gray-500 dark:text-dark-muted'}`}>
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/messages/chat/${conversation._id}`, {
                              state: { jumpToFirstUnread: true },
                            });
                          }}
                          className="mt-1 text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                        >
                          Jump to first unread
                        </button>
                      )}
                      <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">
                      {formatConversationDate(conversation.lastMessageTime)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}