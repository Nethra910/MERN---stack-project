import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from '../api/axios';
import useSocket from '../hooks/useSocket';
import toast from 'react-hot-toast';

const SocialContext = createContext();

export const SocialProvider = ({ children }) => {
  const { socket } = useSocket();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [blocked, setBlocked] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState({ friends: true, requests: true, blocked: true });

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    setLoading({ friends: true, requests: true, blocked: true });
    try {
      const [f, r, b] = await Promise.all([
        axios.get('/friends'),
        axios.get('/friends/requests'),
        axios.get('/friends/blocked'),
      ]);
      setFriends(f.data);
      setRequests(r.data);
      setBlocked(b.data);
    } catch (e) {
      toast.error('Failed to load social data');
    } finally {
      setLoading({ friends: false, requests: false, blocked: false });
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    // Online/offline
    socket.on('user_online', ({ userId }) => {
      setFriends(friends => friends.map(f => f._id === userId ? { ...f, isOnline: true } : f));
      setOnlineUsers(users => [...new Set([...users, userId])]);
    });
    socket.on('user_offline', ({ userId }) => {
      setFriends(friends => friends.map(f => f._id === userId ? { ...f, isOnline: false } : f));
      setOnlineUsers(users => users.filter(id => id !== userId));
    });
    // Friend request received
    socket.on('friend_request_received', ({ request }) => {
      setRequests(r => ({ ...r, incoming: [request, ...r.incoming] }));
      toast.success('New friend request received');
    });
    // Friend request accepted
    socket.on('friend_request_accepted', ({ userId }) => {
      fetchAll();
      toast.success('Friend request accepted');
    });
    // Friend removed
    socket.on('friend_removed', ({ userId }) => {
      setFriends(friends => friends.filter(f => f._id !== userId));
      toast('A friend was removed');
    });
    // User blocked/unblocked
    socket.on('user_blocked', ({ userId }) => {
      setBlocked(blocked => [...blocked, { _id: userId }]);
      setFriends(friends => friends.filter(f => f._id !== userId));
      toast('User blocked');
    });
    socket.on('user_unblocked', ({ userId }) => {
      setBlocked(blocked => blocked.filter(u => u._id !== userId));
      toast('User unblocked');
    });
    // Cleanup
    return () => {
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
      socket.off('friend_removed');
      socket.off('user_blocked');
      socket.off('user_unblocked');
    };
  }, [socket, fetchAll]);

  // Centralized social actions
  const acceptRequest = async (requestId) => {
    try {
      await axios.post('/friends/request/accept', { requestId });
      setRequests(r => ({ ...r, incoming: r.incoming.filter(req => req._id !== requestId) }));
      toast.success('Friend request accepted');
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to accept request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post('/friends/request/reject', { requestId });
      setRequests(r => ({ ...r, incoming: r.incoming.filter(req => req._id !== requestId) }));
      toast('Friend request rejected');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reject request');
    }
  };

  const cancelRequest = async (requestId) => {
    // Optionally implement cancel outgoing request API if available
    setRequests(r => ({ ...r, outgoing: r.outgoing.filter(req => req._id !== requestId) }));
    toast('Request cancelled');
  };

  const removeFriend = async (friendId) => {
    try {
      await axios.delete(`/friends/${friendId}`);
      setFriends(friends => friends.filter(f => f._id !== friendId));
      toast('Friend removed');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to remove friend');
    }
  };

  const blockUser = async (userId) => {
    try {
      await axios.post(`/friends/block/${userId}`);
      setBlocked(blocked => [...blocked, { _id: userId }]);
      setFriends(friends => friends.filter(f => f._id !== userId));
      toast('User blocked');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to block user');
    }
  };

  const unblockUser = async (userId) => {
    try {
      await axios.post(`/friends/unblock/${userId}`);
      setBlocked(blocked => blocked.filter(u => u._id !== userId));
      toast('User unblocked');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to unblock user');
    }
  };

  return (
    <SocialContext.Provider value={{
      friends, requests, blocked, onlineUsers, loading, fetchAll,
      setFriends, setRequests, setBlocked,
      acceptRequest, rejectRequest, cancelRequest, removeFriend, blockUser, unblockUser
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => useContext(SocialContext);
