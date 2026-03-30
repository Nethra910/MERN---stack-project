import { useEffect, useState } from 'react';
import useChat from '../hooks/useChat.js';
import UserSearch from './UserSearch.jsx';

function getOtherParticipant(conversation, currentUser) {
  if (conversation.isGroup) return null;
  return conversation.participants?.find((p) => p._id !== currentUser?._id);
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList() {
  const {
    conversations,
    activeConversation,
    onlineUsers,
    loading,
    fetchConversations,
    selectConversation,
    currentUser,
    deleteConversation,
  } = useChat();

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filtered = conversations.filter((c) => {
    if (!search.trim()) return true;
    if (c.isGroup) return c.groupName?.toLowerCase().includes(search.toLowerCase());
    const other = getOtherParticipant(c, currentUser);
    return (
      other?.name?.toLowerCase().includes(search.toLowerCase()) ||
      other?.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-800">Messages</h2>
          <button
            onClick={() => setShowSearch(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-xl font-bold"
            title="New conversation"
          >
            +
          </button>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full px-3 py-1.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* User Search Modal */}
      {showSearch && (
        <div className="absolute inset-0 z-20 bg-white">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-8">Loading...</p>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-gray-400 text-sm">No conversations yet.</p>
            <p className="text-gray-400 text-xs mt-1">Click + to start a new chat</p>
          </div>
        )}
        {filtered.map((conv) => {
          const other = getOtherParticipant(conv, currentUser);
          const isOnline = other && onlineUsers.includes(other._id);
          const isActive = activeConversation?._id === conv._id;
          const displayName = conv.isGroup ? conv.groupName : other?.name || 'Unknown';
          const initial = displayName?.charAt(0).toUpperCase() || '?';
          const lastMsg = conv.lastMessage;

          return (
            <div
              key={conv._id}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-indigo-50 transition group ${
                isActive ? 'bg-indigo-50 border-r-2 border-indigo-600' : ''
              }`}
              onClick={() => selectConversation(conv)}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${conv.isGroup ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {conv.isGroup ? '👥' : initial}
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                    {displayName}
                  </p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {lastMsg
                    ? `${lastMsg.sender?.name === currentUser?.name ? 'You' : lastMsg.sender?.name}: ${lastMsg.content}`
                    : 'No messages yet'}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete this conversation?')) {
                    deleteConversation(conv._id);
                  }
                }}
                className="hidden group-hover:flex w-6 h-6 items-center justify-center text-gray-400 hover:text-red-500 rounded transition flex-shrink-0"
                title="Delete"
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
