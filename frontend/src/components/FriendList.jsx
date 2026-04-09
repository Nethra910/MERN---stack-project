import React from 'react';
import { useSocial } from '../context/SocialContext';

const FriendList = () => {
  const { friends, loading } = useSocial();

  if (loading.friends) return (
    <div className="animate-pulse space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 border-b">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
  if (!friends.length) return <div className="text-gray-400 text-center py-8">No friends yet</div>;

  return (
    <div>
      {friends.map(friend => (
        <div key={friend._id} className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-3">
            <img src={friend.profilePicture || '/default-avatar.png'} alt="avatar" className="w-10 h-10 rounded-full" />
            <div>
              <div className="font-semibold">{friend.name}</div>
              <div className={friend.isOnline ? 'text-green-500' : 'text-gray-400'}>
                {friend.isOnline ? 'Online' : `Last seen: ${friend.lastSeen ? new Date(friend.lastSeen).toLocaleString() : 'N/A'}`}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="text-blue-500">Chat</button>
            <button className="text-red-500">Remove</button>
            <button className="text-gray-500">Block</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendList;
