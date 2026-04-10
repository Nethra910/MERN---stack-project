import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

// ─── Confirm Modal ─────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-xl">
      <p className="text-white text-sm leading-relaxed mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
);

// ─── Format last seen ──────────────────────────────────
const formatLastSeen = (date) => {
  if (!date) return 'Unknown';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString();
};

// ─── Single chat-contact card ──────────────────────────
const FriendCard = ({ person, conversationId, onRemove }) => {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRemove = async () => {
    await onRemove(conversationId);
    setModal(null);
  };

  return (
    <>
      {modal && (
        <ConfirmModal
          message={`Remove ${person.name} from your contacts? The conversation will be deleted.`}
          onConfirm={handleRemove}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={person.profilePicture || '/default-avatar.png'}
            alt={person.name}
            className="w-12 h-12 rounded-full object-cover bg-gray-700"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name || 'U')}&background=374151&color=fff`;
            }}
          />
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-950
            ${person.isOnline ? 'bg-green-400' : 'bg-gray-600'}`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{person.name || 'Unknown'}</p>
          <p className={`text-xs truncate ${person.isOnline ? 'text-green-400' : 'text-gray-500'}`}>
            {person.isOnline ? 'Online' : `Last seen ${formatLastSeen(person.lastSeen)}`}
          </p>
          {person.bio && (
            <p className="text-gray-500 text-xs truncate mt-0.5">{person.bio}</p>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => navigate(`/messages/chat/${conversationId}`)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Message
          </button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); navigate(`/profile/${person._id}`); }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setModal({ type: 'remove' }); }}
                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors"
                  >
                    Remove Contact
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Main FriendList ───────────────────────────────────
// Shows all 1-to-1 conversation partners — not the old useSocial friends array.
// This means everyone you've ever chatted with appears here automatically.
const FriendList = () => {
  const { conversations, loading, onlineUsers } = useChat();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'online'

  // Get current user ID
  const currentUserId = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return String(u.id || u._id || '');
    } catch { return ''; }
  }, []);

  // Extract unique 1-to-1 chat partners from conversations
  const chatContacts = useMemo(() => {
    return conversations
      .filter(c => !c.isGroup) // only direct chats
      .map(c => {
        const other = c.participants?.find(
          p => String(p._id || p.id) !== currentUserId
        );
        if (!other) return null;
        return {
          person: {
            ...other,
            isOnline: onlineUsers.has(String(other._id || other.id)),
          },
          conversationId: c._id,
          lastMessageTime: c.lastMessageTime,
        };
      })
      .filter(Boolean)
      // Deduplicate by person _id (same person, multiple convos edge case)
      .filter((item, idx, arr) =>
        arr.findIndex(x => String(x.person._id) === String(item.person._id)) === idx
      )
      // Sort: online first, then by last message time
      .sort((a, b) => {
        if (a.person.isOnline && !b.person.isOnline) return -1;
        if (!a.person.isOnline && b.person.isOnline) return 1;
        return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
      });
  }, [conversations, currentUserId, onlineUsers]);

  // Handle remove — deletes the conversation
  const { fetchConversations } = useChat();
  const handleRemove = async (conversationId) => {
    try {
      const { default: API } = await import('../api/axios');
      await API.delete(`/chat/conversations/${conversationId}`);
      await fetchConversations();
    } catch (e) {
      console.error('Failed to remove contact:', e);
    }
  };

  const onlineCount = chatContacts.filter(c => c.person.isOnline).length;

  const filtered = chatContacts.filter(({ person }) => {
    const matchSearch = person.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'online' && person.isOnline);
    return matchSearch && matchFilter;
  });

  // ─── Loading skeleton ────────────────────────────────
  if (loading) return (
    <div className="space-y-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
          <div className="w-12 h-12 rounded-full bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-800 rounded w-32" />
            <div className="h-3 bg-gray-800 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Search + filter bar */}
      {chatContacts.length > 0 && (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={() => setFilter(f => f === 'all' ? 'online' : 'all')}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              filter === 'online'
                ? 'bg-green-600/20 border-green-600/40 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {filter === 'online' ? `Online (${onlineCount})` : 'All contacts'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {chatContacts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">No contacts yet</p>
          <p className="text-gray-600 text-sm mt-1">Start a conversation to see people here</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No contacts match your search</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(({ person, conversationId }) => (
            <FriendCard
              key={conversationId}
              person={person}
              conversationId={conversationId}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendList;