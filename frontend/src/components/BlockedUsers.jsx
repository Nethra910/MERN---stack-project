import React, { useState } from 'react';
import { useSocial } from '../context/SocialContext';

const BlockedUsers = () => {
  const { blocked, loading, unblockUser } = useSocial();
  const [search, setSearch] = useState('');
  const [unblocking, setUnblocking] = useState(null);
  const [confirm, setConfirm] = useState(null); // userId to confirm unblock

  const handleUnblock = async (userId) => {
    setUnblocking(userId);
    await unblockUser(userId);
    setUnblocking(null);
    setConfirm(null);
  };

  if (loading.blocked) return (
    <div className="space-y-1">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <div className="w-11 h-11 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-800 rounded animate-pulse w-24" />
            <div className="h-3 bg-gray-800 rounded animate-pulse w-16" />
          </div>
          <div className="w-20 h-7 bg-gray-800 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );

  if (!blocked.length) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <p className="text-gray-400 font-medium">No blocked users</p>
      <p className="text-gray-600 text-sm mt-1">Users you block won't be able to message you</p>
    </div>
  );

  const filtered = blocked.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {blocked.length > 3 && (
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search blocked users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      <div className="space-y-1">
        {filtered.map(user => (
          <div key={user._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/40 transition-colors">
            {/* Greyed-out avatar to show blocked state */}
            <div className="relative flex-shrink-0">
              <img
                src={user.profilePicture || '/default-avatar.png'}
                alt={user.name}
                className="w-11 h-11 rounded-full object-cover bg-gray-700 grayscale opacity-60"
                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=374151&color=fff`; }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-red-500/40" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-gray-300 font-medium text-sm truncate">{user.name}</p>
              {user.bio && (
                <p className="text-gray-600 text-xs truncate">{user.bio}</p>
              )}
              <p className="text-red-500/70 text-xs">Blocked</p>
            </div>

            {confirm === user._id ? (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setConfirm(null)}
                  className="px-2.5 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg hover:bg-gray-600 transition-colors"
                >
                  No
                </button>
                <button
                  onClick={() => handleUnblock(user._id)}
                  disabled={unblocking === user._id}
                  className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {unblocking === user._id ? '...' : 'Yes, unblock'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(user._id)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 hover:border-blue-500 text-gray-300 hover:text-blue-400 text-xs font-medium rounded-lg transition-colors flex-shrink-0"
              >
                Unblock
              </button>
            )}
          </div>
        ))}
      </div>

      {!filtered.length && search && (
        <p className="text-center text-gray-600 text-sm py-8">No results for "{search}"</p>
      )}
    </div>
  );
};

export default BlockedUsers;