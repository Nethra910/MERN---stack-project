import React from 'react';
import { useSocial } from '../context/SocialContext';

const BlockedUsers = () => {
  const { blocked, loading, unblockUser } = useSocial();

  if (loading.blocked) return (
    <div className="animate-pulse space-y-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 border-b">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
  if (!blocked.length) return <div className="text-gray-400 text-center py-8">No blocked users.</div>;

  return (
    <div>
      {blocked.map(user => (
        <div key={user._id} className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <img src={user.profilePicture || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full" />
            <span>{user.name}</span>
          </div>
          <button className="text-blue-500" onClick={() => unblockUser(user._id)}>Unblock</button>
        </div>
      ))}
    </div>
  );
};

export default BlockedUsers;
