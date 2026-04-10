import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, MessageCircle, UserPlus, Clock, Check, Ban } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useChatRequest } from '../context/ChatRequestContext';
import API from '../api/axios';
import toast from 'react-hot-toast';

// ─── Action button for each search result ─────────────
function ActionButton({ user, onAction }) {
  const [loading, setLoading] = useState(false);
  const { sendRequest, cancelRequest, acceptRequest } = useChatRequest();
  const { createConversation, setCurrentConversation, fetchConversations } = useChat();
  const navigate = useNavigate();

  const handle = async (type) => {
    setLoading(true);
    try {
      if (type === 'message') {
        // Already connected — open conversation
        const res = await useChat;
        navigate(`/messages/chat/${user.conversationId || ''}`);
        onAction?.();
      } else if (type === 'send') {
        const result = await sendRequest(user._id);
        if (result?.status === 'accepted') {
          await fetchConversations();
          onAction?.('connected', user._id, result.conversation);
        } else {
          onAction?.('requested', user._id);
        }
      } else if (type === 'cancel') {
        await cancelRequest(user.requestId);
        onAction?.('none', user._id);
      } else if (type === 'accept') {
        const result = await acceptRequest(user.requestId);
        await fetchConversations();
        onAction?.('connected', user._id, result?.conversation);
      }
    } catch {
      // errors handled in context
    } finally {
      setLoading(false);
    }
  };

  const { connectionStatus } = user;

  if (connectionStatus === 'connected') {
    return (
      <button
        onClick={() => handle('message')}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex-shrink-0"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Message
      </button>
    );
  }

  if (connectionStatus === 'requested') {
    return (
      <button
        onClick={() => handle('cancel')}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-dark-muted text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-500 border border-gray-200 dark:border-dark-border transition-colors disabled:opacity-50 flex-shrink-0"
        title="Cancel request"
      >
        <Clock className="w-3.5 h-3.5" />
        Requested
      </button>
    );
  }

  if (connectionStatus === 'incoming') {
    return (
      <button
        onClick={() => handle('accept')}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex-shrink-0"
      >
        <Check className="w-3.5 h-3.5" />
        Accept
      </button>
    );
  }

  if (connectionStatus === 'blocked') {
    return (
      <span className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-400 text-xs rounded-lg flex-shrink-0 border border-red-200 dark:border-red-800">
        <Ban className="w-3.5 h-3.5" />
        Blocked
      </span>
    );
  }

  // none — show Send Request
  return (
    <button
      onClick={() => handle('send')}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DBEAFE] dark:bg-blue-900/30 text-[#2563EB] dark:text-blue-300 text-xs font-medium rounded-lg hover:bg-[#BFDBFE] dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex-shrink-0"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      {loading ? 'Sending...' : 'Send Request'}
    </button>
  );
}

// ─── Main GlobalSearch component ──────────────────────
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [localStatuses, setLocalStatuses] = useState({}); // optimistic updates
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();
  const { fetchConversations } = useChat();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    try {
      setSearching(true);
      const res = await API.get(`/chat/search/${encodeURIComponent(q.trim())}`);
      const users = res.data.data || [];
      setResults(users);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 350);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setLocalStatuses({});
    inputRef.current?.focus();
  };

  // Handle status change after an action (optimistic UI update)
  const handleAction = (newStatus, userId, conversation) => {
    if (newStatus === 'connected' && conversation) {
      // Navigate to the new conversation
      fetchConversations();
      navigate(`/messages/chat/${conversation._id}`);
      setOpen(false);
      return;
    }
    setLocalStatuses(prev => ({ ...prev, [userId]: newStatus }));
    // Also update results array
    setResults(prev => prev.map(u =>
      u._id === userId ? { ...u, connectionStatus: newStatus } : u
    ));
  };

  const enrichedResults = results.map(u => ({
    ...u,
    connectionStatus: localStatuses[u._id] ?? u.connectionStatus ?? 'none',
  }));

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search people..."
          className="w-full pl-9 pr-8 py-2 bg-gray-100 dark:bg-dark-hover border border-transparent focus:border-[#2563EB] focus:bg-white dark:focus:bg-dark-bg rounded-xl text-sm outline-none transition-all dark:text-dark-text dark:placeholder:text-dark-muted"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dropdown results */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {searching ? (
              <div className="px-4 py-6 text-center">
                <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400 dark:text-dark-muted">Searching...</p>
              </div>
            ) : enrichedResults.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Search className="w-8 h-8 text-gray-300 dark:text-dark-border mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-dark-muted">No users found for "{query}"</p>
              </div>
            ) : (
              <div className="py-2 max-h-80 overflow-y-auto">
                <p className="px-4 py-1 text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                  People
                </p>
                {enrichedResults.map((user, idx) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name}
                          className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                          {(user.name?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-dark-card rounded-full" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-800 dark:text-dark-text truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{user.email}</p>
                    </div>

                    {/* Action button */}
                    <ActionButton
                      user={user}
                      onAction={(newStatus, uid, conv) => handleAction(newStatus, uid || user._id, conv)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}