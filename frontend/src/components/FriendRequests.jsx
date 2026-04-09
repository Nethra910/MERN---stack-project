import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocial } from '../context/SocialContext';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

const RequestSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl">
    <div className="w-11 h-11 rounded-full bg-gray-800 animate-pulse flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-gray-800 rounded animate-pulse w-28" />
      <div className="h-3 bg-gray-800 rounded animate-pulse w-16" />
    </div>
    <div className="flex gap-2">
      <div className="w-16 h-7 bg-gray-800 rounded-lg animate-pulse" />
      <div className="w-16 h-7 bg-gray-800 rounded-lg animate-pulse" />
    </div>
  </div>
);

const IncomingRequestCard = ({ req }) => {
  const navigate = useNavigate();
  const { acceptRequest, rejectRequest } = useSocial();
  const [loading, setLoading] = useState(null); // 'accept' | 'reject'

  const handleAccept = async () => {
    setLoading('accept');
    await acceptRequest(req._id);
    setLoading(null);
  };

  const handleReject = async () => {
    setLoading('reject');
    await rejectRequest(req._id);
    setLoading(null);
  };

  const user = req.senderId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/40 transition-colors group">
      <button
        onClick={() => navigate(`/profile/${user?._id}`)}
        className="flex-shrink-0"
      >
        <img
          src={user?.profilePicture || '/default-avatar.png'}
          alt={user?.name}
          className="w-11 h-11 rounded-full object-cover bg-gray-700 hover:ring-2 hover:ring-blue-500 transition-all"
          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=374151&color=fff`; }}
        />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/profile/${user?._id}`)}
          className="text-white font-medium text-sm hover:underline truncate block text-left"
        >
          {user?.name}
        </button>
        {user?.bio && (
          <p className="text-gray-500 text-xs truncate">{user.bio}</p>
        )}
        <p className="text-gray-600 text-xs mt-0.5">{timeAgo(req.createdAt)}</p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={handleAccept}
          disabled={!!loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          {loading === 'accept' ? (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : 'Accept'}
        </button>
        <button
          onClick={handleReject}
          disabled={!!loading}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-xs font-medium rounded-lg transition-colors"
        >
          {loading === 'reject' ? '...' : 'Decline'}
        </button>
      </div>
    </div>
  );
};

const OutgoingRequestCard = ({ req }) => {
  const navigate = useNavigate();
  const { cancelRequest } = useSocial();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    await cancelRequest(req._id);
    setLoading(false);
  };

  const user = req.receiverId;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/40 transition-colors">
      <button onClick={() => navigate(`/profile/${user?._id}`)}>
        <img
          src={user?.profilePicture || '/default-avatar.png'}
          alt={user?.name}
          className="w-11 h-11 rounded-full object-cover bg-gray-700 flex-shrink-0"
          onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=374151&color=fff`; }}
        />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-white font-medium text-sm truncate">{user?.name}</p>
        <p className="text-gray-500 text-xs">Pending · {timeAgo(req.createdAt)}</p>
      </div>

      <button
        onClick={handleCancel}
        disabled={loading}
        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-xs font-medium rounded-lg transition-colors border border-gray-700"
      >
        {loading ? '...' : 'Cancel'}
      </button>
    </div>
  );
};

const FriendRequests = () => {
  const { requests, loading } = useSocial();

  if (loading.requests) return (
    <div className="space-y-1">
      {[...Array(3)].map((_, i) => <RequestSkeleton key={i} />)}
    </div>
  );

  const hasIncoming = requests.incoming.length > 0;
  const hasOutgoing = requests.outgoing.length > 0;

  if (!hasIncoming && !hasOutgoing) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">No pending requests</p>
        <p className="text-gray-600 text-sm mt-1">Friend requests you send or receive will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming */}
      {hasIncoming && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Incoming
            </h3>
            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
              {requests.incoming.length}
            </span>
          </div>
          <div className="space-y-1">
            {requests.incoming.map(req => (
              <IncomingRequestCard key={req._id} req={req} />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing */}
      {hasOutgoing && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Sent
            </h3>
            <span className="bg-gray-700 text-gray-300 text-xs px-1.5 py-0.5 rounded-full font-medium">
              {requests.outgoing.length}
            </span>
          </div>
          <div className="space-y-1">
            {requests.outgoing.map(req => (
              <OutgoingRequestCard key={req._id} req={req} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendRequests;