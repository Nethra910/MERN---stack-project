import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { useChat } from '../context/ChatContext';
import MessageInput from './MessageInput';

// ─── Emoji picker for reactions ───────────────────────
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ─── Sanitize user content to prevent XSS ─────────────
const sanitizeContent = (content) => {
  if (!content) return '';
  // Configure DOMPurify to only allow plain text
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });
  return clean;
};

// ─── Helper: serialise reactions map from backend ─────
const parseReactions = (reactions) => {
  if (!reactions) return {};
  if (reactions instanceof Map) {
    const obj = {};
    reactions.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  return reactions; // already plain object
};

// ─── Single Message Bubble ────────────────────────────
function MessageBubble({ msg, isMine, currentUserId, onReply, onEdit, onDelete, onForward, onReact }) {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setReactionPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const reactions = parseReactions(msg.reactions);
  const isDeleted = msg.isDeleted && msg.deleteType === 'everyone';

  const formatTime = (msg) => {
    const d = new Date(msg.createdAt || msg.timestamp);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex group ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className={`relative max-w-xs lg:max-w-md ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>

        {/* ─── Reply preview ─────────────────────────── */}
        {msg.replyTo && !isDeleted && (
          <div
            className={`text-xs px-3 py-1.5 mb-1 rounded-lg border-l-4 ${
              isMine
                ? 'bg-blue-400/20 border-blue-300 text-blue-100'
                : 'bg-gray-100 dark:bg-dark-hover border-gray-400 dark:border-gray-600 text-gray-600 dark:text-dark-muted'
            } truncate max-w-full`}
          >
            {msg.replyTo?.content && (
              <>
                <span className="font-semibold">
                  {msg.replyTo?.senderId?.name || 'Unknown'}:
                </span>{' '}
                {sanitizeContent(msg.replyTo.content.slice(0, 60))}
              </>
            )}
            {!msg.replyTo?.content && '...'}
          </div>
        )}

        {/* ─── Bubble + action button ────────────────── */}
        <div className="flex items-end gap-1">
          {!isMine && (
            msg.senderId?.profilePicture ? (
              <img
                src={msg.senderId.profilePicture}
                alt={msg.senderId?.name || 'User'}
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-4"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-4">
                {(msg.senderId?.name?.[0] || '?').toUpperCase()}
              </div>
            )
          )}

          <div ref={menuRef} className="relative">
            {/* Action button — appears on hover */}
            {!isDeleted && (
              <button
                onClick={() => { setMenuOpen((v) => !v); setReactionPickerOpen(false); }}
                className={`absolute top-1 ${isMine ? '-left-7' : '-right-7'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted text-xs`}
              >
                ⋯
              </button>
            )}

            {/* Context menu */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute z-50 bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-dark-border py-1 min-w-[160px]`}
                >
                  <MenuItem icon="😊" label="React" onClick={() => { setReactionPickerOpen(true); setMenuOpen(false); }} />
                  <MenuItem icon="↩️" label="Reply" onClick={() => { onReply(msg); setMenuOpen(false); }} />
                  <MenuItem icon="➡️" label="Forward" onClick={() => { onForward(msg); setMenuOpen(false); }} />
                  {isMine && !msg.isDeleted && (
                    <MenuItem icon="✏️" label="Edit" onClick={() => { onEdit(msg); setMenuOpen(false); }} />
                  )}
                  {!msg.isDeleted && (
                    <>
                      {isMine && (
                        <MenuItem icon="🗑️" label="Delete for everyone" danger onClick={() => { onDelete(msg._id, 'everyone'); setMenuOpen(false); }} />
                      )}
                      <MenuItem icon="🗑️" label="Delete for me" danger onClick={() => { onDelete(msg._id, 'self'); setMenuOpen(false); }} />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reaction picker */}
            <AnimatePresence>
              {reactionPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute z-50 bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'} bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-dark-border px-2 py-1.5 flex gap-1`}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onReact(msg._id, emoji); setReactionPickerOpen(false); }}
                      className="text-xl hover:scale-125 transition-transform p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message bubble */}
            <div
              className={`px-4 py-2.5 rounded-2xl shadow-sm relative ${
                isDeleted
                  ? 'bg-gray-100 dark:bg-dark-hover text-gray-400 dark:text-dark-muted italic border border-gray-200 dark:border-dark-border'
                  : isMine
                  ? 'bg-blue-500 text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-dark-hover text-gray-800 dark:text-dark-text rounded-bl-sm'
              }`}
            >
              {/* Forwarded label */}
              {msg.forwardedFrom?.messageId && !isDeleted && (
                <p className={`text-xs mb-1 ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                  ➡️ Forwarded
                </p>
              )}

              {/* Media attachments */}
              {msg.attachments?.length > 0 && !isDeleted && (
                <div className={`mb-2 ${msg.attachments.length > 1 && msg.attachments[0].type !== 'audio' ? 'grid grid-cols-2 gap-1' : ''}`}>
                  {msg.attachments.map((attachment, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden">
                      {attachment.type === 'video' ? (
                        <div className="relative">
                          <video
                            src={attachment.url}
                            controls
                            className="max-w-full rounded-lg max-h-64"
                            poster={attachment.thumbnail}
                          />
                        </div>
                      ) : attachment.type === 'audio' ? (
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${isMine ? 'bg-blue-400/30' : 'bg-gray-200'}`}>
                          <span className="text-lg">🎤</span>
                          <audio
                            src={attachment.url}
                            controls
                            className="h-8 max-w-[200px]"
                          />
                          {attachment.duration && (
                            <span className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                              {Math.floor(attachment.duration / 60)}:{String(Math.floor(attachment.duration % 60)).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <img
                          src={attachment.url}
                          alt={attachment.name || 'Image'}
                          className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition"
                          onClick={() => window.open(attachment.url, '_blank')}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Text content */}
              {msg.content && (
                <p className="text-sm break-words leading-relaxed">{sanitizeContent(msg.content)}</p>
              )}

              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <span className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatTime(msg)}
                </span>
                {msg.isEdited && !isDeleted && (
                  <span className={`text-xs ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                    · edited
                  </span>
                )}
              </div>
            </div>

            {/* Reactions display */}
            {Object.keys(reactions).length > 0 && !isDeleted && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {Object.entries(reactions).map(([emoji, users]) =>
                  users.length > 0 ? (
                    <button
                      key={emoji}
                      onClick={() => onReact(msg._id, emoji)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                        users.includes(currentUserId) || users.map(String).includes(String(currentUserId))
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </button>
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-dark-hover transition ${
        danger ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-dark-text'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Forward Modal ────────────────────────────────────
function ForwardModal({ message, conversations, onForward, onClose, currentUserId }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const getConvName = (conv) => {
    if (conv.isGroup) return conv.groupName || 'Group';
    const other = conv.participants?.find(
      (p) => String(p._id || p.id) !== String(currentUserId)
    );
    return other?.name || 'Unknown';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100 dark:border-dark-border">
          <h3 className="font-bold text-gray-800 dark:text-dark-text text-lg">Forward Message</h3>
          <p className="text-sm text-gray-500 dark:text-dark-muted mt-0.5 truncate">"{message?.content?.slice(0, 50)}"</p>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <label
              key={conv._id}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-hover transition"
            >
              <input
                type="checkbox"
                checked={selected.includes(conv._id)}
                onChange={() => toggle(conv._id)}
                className="w-4 h-4 accent-blue-500"
              />
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                {getConvName(conv)[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text truncate">{getConvName(conv)}</span>
            </label>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text font-medium text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition"
          >
            Cancel
          </button>
          <button
            disabled={selected.length === 0}
            onClick={() => onForward(message._id, selected)}
            className="flex-1 py-2 rounded-xl bg-blue-500 text-white font-medium text-sm disabled:opacity-50 hover:bg-blue-600 transition"
          >
            Forward{selected.length > 0 ? ` (${selected.length})` : ''}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Search bar ───────────────────────────────────────
function SearchBar({ onSearch, onClose, results, loading, onJumpTo }) {
  const [query, setQuery] = useState('');
  const timer = useRef(null);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(q), 400);
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card overflow-hidden"
    >
      <div className="p-3">
        <div className="flex items-center gap-2 bg-white dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border px-3 py-2">
          <span className="text-gray-400 dark:text-dark-muted">🔍</span>
          <input
            autoFocus
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={handleChange}
            className="flex-1 text-sm outline-none bg-transparent text-gray-700 dark:text-dark-text placeholder:text-gray-400 dark:placeholder:text-dark-muted"
          />
          {loading && <span className="text-gray-400 dark:text-dark-muted text-xs">...</span>}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text text-sm">✕</button>
        </div>

        {results.length > 0 && (
          <div className="mt-2 max-h-52 overflow-y-auto space-y-1">
            {results.map((msg) => (
              <button
                key={msg._id}
                onClick={() => onJumpTo(msg._id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-hover border border-transparent hover:border-gray-200 dark:hover:border-dark-border transition text-sm"
              >
                <p className="font-medium text-gray-700 dark:text-dark-text text-xs">{msg.senderId?.name}</p>
                <p className="text-gray-500 dark:text-dark-muted truncate">{msg.content}</p>
              </button>
            ))}
          </div>
        )}
        {query.length > 0 && results.length === 0 && !loading && (
          <p className="text-center text-xs text-gray-400 dark:text-dark-muted mt-2">No messages found</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ChatWindow ──────────────────────────────────
export default function ChatWindow() {
  const {
    currentConversation, messages, typingUsers, onlineUsers,
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
    searchResults, searchLoading,
    forwardModalOpen, setForwardModalOpen,
    messageToForward, setMessageToForward,
    conversations,
    editMessage, deleteMessage, reactToMessage, forwardMessage,
    searchInConversation,
    hasMoreMessages, isLoadingMore, loadMoreMessages,
  } = useChat();

  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const messageRefs    = useRef({});
  const prevScrollHeight = useRef(0);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const currentUserId = String(user?.id || user?._id || '');

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (messagesContainerRef.current && prevScrollHeight.current > 0) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeight.current;
      if (scrollDiff > 0) {
        messagesContainerRef.current.scrollTop = scrollDiff;
      }
      prevScrollHeight.current = 0;
    }
  }, [messages]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isLoadingMore || !hasMoreMessages) return;

    // Load more when scrolled near top (within 100px)
    if (container.scrollTop < 100) {
      prevScrollHeight.current = container.scrollHeight;
      loadMoreMessages();
    }
  }, [isLoadingMore, hasMoreMessages, loadMoreMessages]);

  const getOtherUser = (conversation) => {
    if (!conversation?.participants?.length) return null;
    return conversation.participants.find(
      (p) => String(p?.id || p?._id) !== currentUserId
    ) || null;
  };

  const getDisplayName = (conversation) => {
    if (!conversation) return '';
    if (conversation.isGroup) return conversation.groupName || 'Group Chat';
    return getOtherUser(conversation)?.name || 'Unknown';
  };

  const isOnline = () => {
    const other = getOtherUser(currentConversation);
    return other ? onlineUsers.has(String(other._id || other.id)) : false;
  };

  const getLastSeenText = () => {
    const other = getOtherUser(currentConversation);
    if (!other?.lastSeen) return 'Offline';
    
    const lastSeen = new Date(other.lastSeen);
    const now = new Date();
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  };

  const handleJumpTo = useCallback((msgId) => {
    setHighlightedId(msgId);
    setSearchOpen(false);
    const el = messageRefs.current[msgId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightedId(null), 2000);
  }, []);

  if (!currentConversation) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-dark-bg dark:to-dark-card"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-600 dark:text-dark-text text-lg font-medium">No conversation selected</p>
          <p className="text-gray-400 dark:text-dark-muted text-sm">Select a chat to start messaging</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full bg-white dark:bg-dark-card transition-colors"
    >
      {/* ─── Header ──────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            {getDisplayName(currentConversation)[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-dark-text text-sm">{getDisplayName(currentConversation)}</h2>
            <p className="text-xs text-gray-500 dark:text-dark-muted flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline() ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {isOnline() ? 'Online' : `Last seen ${getLastSeenText()}`}
            </p>
          </div>
        </div>

        {/* Search toggle */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={`p-2 rounded-lg text-sm transition ${searchOpen ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-dark-hover text-gray-500 dark:text-dark-muted'}`}
        >
          🔍
        </button>
      </div>

      {/* ─── Search bar ──────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <SearchBar
            onSearch={searchInConversation}
            onClose={() => setSearchOpen(false)}
            results={searchResults}
            loading={searchLoading}
            onJumpTo={handleJumpTo}
          />
        )}
      </AnimatePresence>

      {/* ─── Messages ────────────────────────────────── */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50 dark:bg-dark-bg transition-colors"
      >
        {/* Loading indicator for older messages */}
        {isLoadingMore && (
          <div className="flex justify-center py-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          </div>
        )}
        
        {/* Load more button (fallback) */}
        {hasMoreMessages && !isLoadingMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMoreMessages}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              ↑ Load older messages
            </button>
          </div>
        )}

        {messages.map((msg, idx) => {
          const senderId = typeof msg.senderId === 'object' ? String(msg.senderId?._id) : String(msg.senderId);
          const isMine = senderId === currentUserId;
          const isHighlighted = highlightedId === msg._id;

          // Skip messages deleted "for everyone"
          // OR messages where current user deleted it "for me" (self)
          if (msg.isDeleted && msg.deleteType === 'everyone') {
            // Show "This message was deleted" placeholder - handled in MessageBubble
          } else if (msg.deletedBy && Array.isArray(msg.deletedBy)) {
            // Check if current user deleted this message for themselves
            const deletedByMe = msg.deletedBy.some(id => String(id) === currentUserId);
            if (deletedByMe) return null; // Hide this message
          }

          return (
            <div
              key={msg._id || idx}
              ref={(el) => { if (el) messageRefs.current[msg._id] = el; }}
              className={`transition-all duration-500 rounded-xl ${isHighlighted ? 'bg-yellow-100 scale-105' : ''}`}
            >
              <MessageBubble
                msg={msg}
                isMine={isMine}
                currentUserId={currentUserId}
                onReply={setReplyingTo}
                onEdit={setEditingMessage}
                onDelete={deleteMessage}
                onForward={(msg) => { setMessageToForward(msg); setForwardModalOpen(true); }}
                onReact={reactToMessage}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-2"
            >
              <div className="bg-gray-200 px-3 py-2 rounded-2xl flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ delay: i * 0.12, duration: 0.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-gray-500"
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* ─── Message Input (with reply/edit context) ── */}
      <MessageInput />

      {/* ─── Forward Modal ────────────────────────────── */}
      <AnimatePresence>
        {forwardModalOpen && messageToForward && (
          <ForwardModal
            message={messageToForward}
            conversations={conversations}
            currentUserId={currentUserId}
            onForward={forwardMessage}
            onClose={() => { setForwardModalOpen(false); setMessageToForward(null); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}