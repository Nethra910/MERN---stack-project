import React from 'react';
import { useSocial } from '../context/SocialContext';

const FriendRequests = () => {
  const { requests, loading, acceptRequest, rejectRequest, cancelRequest } = useSocial();

  if (loading.requests) return (
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
  return (
    <div>
      <div className="mb-4">
        <div className="font-bold mb-2">Incoming Requests</div>
        {requests.incoming.length ? requests.incoming.map(req => (
          <div key={req._id} className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <img src={req.senderId?.profilePicture || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full" />
              <span>{req.senderId?.name}</span>
            </div>
            <div className="flex gap-2">
              <button className="text-green-500" onClick={() => acceptRequest(req._id)}>Accept</button>
              <button className="text-red-500" onClick={() => rejectRequest(req._id)}>Reject</button>
            </div>
          </div>
        )) : <div className="text-gray-400 text-center py-4">No incoming requests.</div>}
      </div>
      <div>
        <div className="font-bold mb-2">Outgoing Requests</div>
        {requests.outgoing.length ? requests.outgoing.map(req => (
          <div key={req._id} className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <img src={req.receiverId?.profilePicture || '/default-avatar.png'} alt="avatar" className="w-8 h-8 rounded-full" />
              <span>{req.receiverId?.name}</span>
            </div>
            <button className="text-gray-500" onClick={() => cancelRequest(req._id)}>Cancel</button>
          </div>
        )) : <div className="text-gray-400 text-center py-4">No outgoing requests.</div>}
      </div>
    </div>
  );
};

export default FriendRequests;
