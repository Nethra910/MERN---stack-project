import React, { useState } from 'react';
import FriendList from '../components/FriendList';
import FriendRequests from '../components/FriendRequests';
import BlockedUsers from '../components/BlockedUsers';
import { useSocial } from '../context/SocialContext';

const FriendsPage = () => {
  const [tab, setTab] = useState('friends');
  const { friends, requests, blocked, pendingRequestCount } = useSocial();

  const tabs = [
    { key: 'friends', label: 'Friends', count: friends.length },
    { key: 'requests', label: 'Requests', count: pendingRequestCount, highlight: pendingRequestCount > 0 },
    { key: 'blocked', label: 'Blocked', count: blocked.length },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Friends</h1>
          <p className="text-gray-400 text-sm mt-1">
            {friends.length} friend{friends.length !== 1 ? 's' : ''} · {pendingRequestCount} pending request{pendingRequestCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800">
          {tabs.map(({ key, label, count, highlight }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${tab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }
              `}
            >
              {label}
              {count > 0 && (
                <span className={`
                  text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center
                  ${tab === key
                    ? 'bg-blue-500 text-white'
                    : highlight
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {tab === 'friends' && <FriendList />}
          {tab === 'requests' && <FriendRequests />}
          {tab === 'blocked' && <BlockedUsers />}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;