import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Search, Users, X, MessageCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import API from '../api/axios';

function GroupCreateModal({ onClose, onCreate, currentUserId }) {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinApprovalRequired, setJoinApprovalRequired] = useState(true);
  const [linkJoinEnabled, setLinkJoinEnabled] = useState(true);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const response = await API.get(`/chat/search/${query}`);
      const data = response?.data?.data || [];
      setResults(data.filter((u) => String(u?._id) !== String(currentUserId)));
    } catch { setResults([]); } finally { setLoading(false); }
  };

  const toggleSelect = (user) => {
    setSelected((prev) => {
      const exists = prev.some((u) => String(u._id) === String(user._id));
      return exists ? prev.filter((u) => String(u._id) !== String(user._id)) : [...prev, user];
    });
  };

  const handleCreate = async () => {
    setError('');
    if (!groupName.trim()) { setError('Group name is required.'); return; }
    if (selected.length < 2) { setError('Select at least 2 participants.'); return; }
    await onCreate(selected.map((u) => u._id), {
      isGroup: true, groupName: groupName.trim(), description: description.trim(),
      groupSettings: { joinApprovalRequired, linkJoinEnabled },
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-4 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-dark-text text-lg">Create group</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-dark-muted font-medium">Group name</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:ring-2 focus:ring-[#2563EB] outline-none dark:text-dark-text"
              placeholder="Design team" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-dark-muted font-medium">Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-sm focus:ring-2 focus:ring-[#2563EB] outline-none dark:text-dark-text"
              placeholder="Project updates and planning" />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-dark-muted font-medium">Add participants</label>
            <div className="mt-2 flex flex-wrap gap-2 min-h-[28px]">
              {selected.map((user) => (
                <span key={user._id} onClick={() => toggleSelect(user)}
                  className="px-2 py-1 rounded-full bg-[#DBEAFE] text-[#2563EB] text-xs cursor-pointer hover:bg-blue-200 flex items-center gap-1">
                  {user.name} <X className="w-3 h-3" />
                </span>
              ))}
              {selected.length === 0 && <span className="text-xs text-gray-400 dark:text-dark-muted">No participants selected yet.</span>}
            </div>
            <input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm focus:ring-2 focus:ring-[#2563EB] outline-none dark:text-dark-text"
              placeholder="Search users..." />
            {loading && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
            {results.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {results.map((user) => {
                  const isSelected = selected.some((u) => String(u._id) === String(user._id));
                  return (
                    <button key={user._id} onClick={() => toggleSelect(user)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition text-sm flex items-center gap-2 ${isSelected ? 'border-[#2563EB] bg-[#DBEAFE] text-[#2563EB]' : 'border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover dark:text-dark-text'}`}>
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(user.name?.[0] || '?').toUpperCase()}
                      </span>
                      <span className="flex-1 truncate">{user.name}</span>
                      <span className="text-[10px] text-gray-400 truncate">{user.email}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-muted cursor-pointer">
              <input type="checkbox" checked={joinApprovalRequired} onChange={(e) => setJoinApprovalRequired(e.target.checked)} className="accent-[#2563EB]" />
              Require approval to join
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-dark-muted cursor-pointer">
              <input type="checkbox" checked={linkJoinEnabled} onChange={(e) => setLinkJoinEnabled(e.target.checked)} className="accent-[#2563EB]" />
              Enable invite links
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-dark-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted text-sm hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">Cancel</button>
          <button onClick={handleCreate} className="flex-1 py-2 rounded-xl bg-[#2563EB] text-white text-sm hover:bg-[#1D4ED8] transition-colors">Create group</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ConversationList() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const {
    conversations, currentConversation, setCurrentConversation, fetchMessages,
    onlineUsers, loading, unreadCounts, fetchUnreadCounts, markConversationAsRead,
    pinConversation, unpinConversation, createConversation,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [showPeopleSection, setShowPeopleSection] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const currentUserId = String(user?.id || user?._id || '');

  useEffect(() => { fetchUnreadCounts(); }, [fetchUnreadCounts]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setUserResults([]);
      setShowPeopleSection(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 2) return;
      try {
        setUserSearchLoading(true);
        const response = await API.get(`/chat/search/${encodeURIComponent(query.trim())}`);
        const users = (response?.data?.data || []).filter((u) => String(u._id) !== currentUserId);
        setUserResults(users);
        setShowPeopleSection(true);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 400);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setUserResults([]);
    setShowPeopleSection(false);
    searchRef.current?.focus();
  };

  const handleStartChat = async (userId) => {
    try {
      await createConversation([userId]);
      clearSearch();
    } catch (e) {
      console.error('Failed to create conversation:', e);
    }
  };

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation._id);
    if (unreadCounts[conversation._id]) markConversationAsRead(conversation._id);
    navigate(`/messages/chat/${conversation._id}`);
  };

  const isPinned = (conversation) =>
    conversation.pinnedBy?.some((p) => String(p.userId) === currentUserId);

  const handlePinToggle = (e, conversation) => {
    e.stopPropagation();
    isPinned(conversation) ? unpinConversation(conversation._id) : pinConversation(conversation._id);
  };

  const getOtherUser = (conversation) => {
    if (!conversation?.participants?.length) return null;
    return conversation.participants.find((p) => String(p?._id) !== currentUserId) || null;
  };

  const getDisplayName = (conversation) => {
    if (conversation.isGroup) return conversation.groupName || 'Group Chat';
    const other = getOtherUser(conversation);
    return other?.name || other?.fullName || other?.username || 'Unknown';
  };

  const isUserOnline = (conversation) => {
    if (conversation.isGroup) return false;
    const other = getOtherUser(conversation);
    return other?._id ? onlineUsers.has(String(other._id)) : false;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const aPinned = isPinned(a);
      const bPinned = isPinned(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter((c) => getDisplayName(c).toLowerCase().includes(q));
  }, [conversations, currentUserId, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card transition-colors">

      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 dark:text-dark-text flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#2563EB]" />
            Messages
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setGroupModalOpen(true)}
            className="p-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors"
            title="Create group chat"
          >
            <Users className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Unified search bar — filters convos instantly + searches users after 400ms */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-dark-muted pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search conversations or find people..."
            className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white dark:focus:bg-dark-hover transition-all dark:text-dark-text dark:placeholder:text-dark-muted"
          />
          <AnimatePresence>
            {isSearching && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text rounded-full hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {isSearching && (
            <motion.p
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="text-xs text-gray-400 dark:text-dark-muted mt-2 px-0.5"
            >
              {userSearchLoading
                ? 'Finding people...'
                : showPeopleSection && userResults.length > 0
                  ? `${userResults.length} people · ${filteredConversations.length} conversations`
                  : `${filteredConversations.length} conversation${filteredConversations.length !== 1 ? 's' : ''}`}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* People results */}
        <AnimatePresence>
          {isSearching && showPeopleSection && userResults.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-4 pt-3 pb-1.5">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                  People — click to start chatting
                </p>
              </div>
              {userResults.map((u, idx) => (
                <motion.div
                  key={u._id}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => handleStartChat(u._id)}
                  className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-dark-hover transition-colors"
                >
                  <div className="flex-shrink-0">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {(u.name?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 dark:text-dark-text truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{u.email}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-[#2563EB] bg-[#DBEAFE] dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                    Message
                  </span>
                </motion.div>
              ))}
              {filteredConversations.length > 0 && (
                <div className="px-4 pt-3 pb-1.5 border-t border-gray-100 dark:border-dark-border mt-1">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-dark-muted uppercase tracking-wider">
                    Conversations
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-dark-hover flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-dark-hover rounded w-28" />
                  <div className="h-2.5 bg-gray-100 dark:bg-dark-border rounded w-44" />
                </div>
              </div>
            ))}
          </div>

        ) : filteredConversations.length === 0 && !(showPeopleSection && userResults.length > 0) ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 px-6 text-center"
          >
            {isSearching ? (
              <>
                <Search className="w-10 h-10 text-gray-300 dark:text-dark-border mb-3" />
                <p className="font-medium text-sm text-gray-500 dark:text-dark-muted">No results for "{searchQuery}"</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Try a different name or email</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#DBEAFE] flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-[#2563EB]" />
                </div>
                <p className="font-medium text-sm text-gray-500 dark:text-dark-muted">No conversations yet</p>
                <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">Search for someone above to start chatting</p>
              </>
            )}
          </motion.div>

        ) : (
          <AnimatePresence>
            {filteredConversations.map((conversation, idx) => {
              const otherParticipant = conversation.participants?.find(
                (p) => String(p._id) !== String(currentUserId)
              );
              const profilePic = conversation.isGroup ? null : otherParticipant?.profilePicture;
              const displayName = getDisplayName(conversation);
              const unreadCount = unreadCounts[conversation._id] || 0;
              const pinned = isPinned(conversation);
              const isActive = String(chatId || currentConversation?._id) === String(conversation._id);

              return (
                <motion.div
                  key={conversation._id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`relative px-3 py-2.5 cursor-pointer transition-all border-b border-gray-50 dark:border-dark-border group
                    ${isActive ? 'bg-[#DBEAFE] dark:bg-blue-900/20 border-l-4 border-l-[#2563EB]' : 'hover:bg-gray-50 dark:hover:bg-dark-hover'}
                    ${pinned && !isActive ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                  `}
                >
                  {pinned && (
                    <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-0 transition-opacity">
                      <Pin className="w-3 h-3 text-amber-500" fill="currentColor" />
                    </div>
                  )}
                  <button
                    onClick={(e) => handlePinToggle(e, conversation)}
                    className={`absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10
                      ${pinned ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-hover'}`}
                    title={pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-3.5 h-3.5" fill={pinned ? 'currentColor' : 'none'} />
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {profilePic ? (
                        <img src={profilePic} alt={displayName} className="w-11 h-11 rounded-full object-cover" />
                      ) : (
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold
                          ${conversation.isGroup ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : 'bg-gradient-to-br from-purple-400 to-pink-500'}`}>
                          {conversation.isGroup ? <Users className="w-5 h-5" /> : (displayName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      {isUserOnline(conversation) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-card rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`font-medium text-sm truncate ${unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-dark-text'}`}>
                          {displayName}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                          {unreadCount > 0 && (
                            <motion.span
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </motion.span>
                          )}
                          <span className="text-[10px] text-gray-400 dark:text-dark-muted whitespace-nowrap">
                            {formatDate(conversation.lastMessageTime)}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs truncate ${unreadCount > 0 ? 'text-gray-700 dark:text-dark-text font-medium' : 'text-gray-400 dark:text-dark-muted'}`}>
                        {conversation.lastMessage || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {groupModalOpen && (
          <GroupCreateModal
            onClose={() => setGroupModalOpen(false)}
            onCreate={createConversation}
            currentUserId={currentUserId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}