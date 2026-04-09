import React, { useState } from 'react';
import FriendList from './FriendList';
import FriendRequests from './FriendRequests';
import BlockedUsers from './BlockedUsers';

const FriendsPage = () => {
  const [tab, setTab] = useState('friends');

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex border-b mb-4">
        <button className={`px-4 py-2 ${tab === 'friends' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setTab('friends')}>Friends</button>
        <button className={`px-4 py-2 ${tab === 'requests' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setTab('requests')}>Requests</button>
        <button className={`px-4 py-2 ${tab === 'blocked' ? 'border-b-2 border-blue-500 font-bold' : ''}`} onClick={() => setTab('blocked')}>Blocked</button>
      </div>
      <div>
        {tab === 'friends' && <FriendList />}
        {tab === 'requests' && <FriendRequests />}
        {tab === 'blocked' && <BlockedUsers />}
      </div>
    </div>
  );
};

export default FriendsPage;
