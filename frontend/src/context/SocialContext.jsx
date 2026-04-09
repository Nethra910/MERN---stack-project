import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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

  // Ref to avoid stale closure in socket handlers
  const fetchAllRef = useRef(null);

  // ─── Fetch All Social Data ───────────────────────────────────────────────
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

  // Keep ref in sync so socket handlers always call latest version
  useEffect(() => {
    fetchAllRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Socket Event Listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Online / offline presence
    const onUserOnline = ({ userId }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, isOnline: true } : f));
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    };
    const onUserOffline = ({ userId }) => {
      setFriends(prev => prev.map(f => f._id === userId ? { ...f, isOnline: false } : f));
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    };

    // Incoming friend request
    const onRequestReceived = ({ request }) => {
      setRequests(prev => ({
        ...prev,
        incoming: [request, ...prev.incoming],
      }));
      toast.success(`${request.senderId?.name || 'Someone'} sent you a friend request`);
    };

    // Friend request cancelled by sender
    const onRequestCancelled = ({ requestId }) => {
      setRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r._id !== requestId),
      }));
    };

    // Friend request accepted — only re-fetch data (no toast: the action itself shows it)
    const onRequestAccepted = () => {
      fetchAllRef.current?.();
    };

    // Friend request rejected — remove from outgoing
    const onRequestRejected = ({ userId }) => {
      setRequests(prev => ({
        ...prev,
        outgoing: prev.outgoing.filter(r => r.receiverId?._id !== userId),
      }));
    };

    // Friend removed
    const onFriendRemoved = ({ userId }) => {
      setFriends(prev => prev.filter(f => f._id !== userId));
    };

    // Blocked / unblocked
    const onUserBlocked = ({ userId }) => {
      setFriends(prev => prev.filter(f => f._id !== userId));
    };
    const onUserUnblocked = () => {
      // No action needed client-side; user can re-send request manually
    };

    socket.on('user_online', onUserOnline);
    socket.on('user_offline', onUserOffline);
    socket.on('friend_request_received', onRequestReceived);
    socket.on('friend_request_cancelled', onRequestCancelled);
    socket.on('friend_request_accepted', onRequestAccepted);
    socket.on('friend_request_rejected', onRequestRejected);
    socket.on('friend_removed', onFriendRemoved);
    socket.on('user_blocked', onUserBlocked);
    socket.on('user_unblocked', onUserUnblocked);

    return () => {
      socket.off('user_online', onUserOnline);
      socket.off('user_offline', onUserOffline);
      socket.off('friend_request_received', onRequestReceived);
      socket.off('friend_request_cancelled', onRequestCancelled);
      socket.off('friend_request_accepted', onRequestAccepted);
      socket.off('friend_request_rejected', onRequestRejected);
      socket.off('friend_removed', onFriendRemoved);
      socket.off('user_blocked', onUserBlocked);
      socket.off('user_unblocked', onUserUnblocked);
    };
  }, [socket]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const sendFriendRequest = async (receiverId) => {
    try {
      const res = await axios.post('/friends/request', { receiverId });
      toast.success(res.data.message || 'Friend request sent');
      // Refresh outgoing list
      await fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to send request');
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await axios.post('/friends/request/accept', { requestId });
      // Optimistically remove from incoming
      setRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r._id !== requestId),
      }));
      toast.success('Friend request accepted!');
      // Fetch to get the new friend in the list
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to accept request');
    }
  };

  const rejectRequest = async (requestId) => {
    try {
      await axios.post('/friends/request/reject', { requestId });
      setRequests(prev => ({
        ...prev,
        incoming: prev.incoming.filter(r => r._id !== requestId),
      }));
      toast('Request declined');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reject request');
    }
  };

  const cancelRequest = async (requestId) => {
    try {
      await axios.post('/friends/request/cancel', { requestId });
      setRequests(prev => ({
        ...prev,
        outgoing: prev.outgoing.filter(r => r._id !== requestId),
      }));
      toast('Request cancelled');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to cancel request');
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await axios.delete(`/friends/${friendId}`);
      setFriends(prev => prev.filter(f => f._id !== friendId));
      toast('Friend removed');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to remove friend');
    }
  };

  const blockUser = async (userId) => {
    try {
      await axios.post(`/friends/block/${userId}`);
      // fetchAll to get full blocked user data (name, avatar, etc.)
      await fetchAll();
      toast('User blocked');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to block user');
    }
  };

  const unblockUser = async (userId) => {
    try {
      await axios.post(`/friends/unblock/${userId}`);
      setBlocked(prev => prev.filter(u => u._id !== userId));
      toast('User unblocked');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to unblock user');
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────
  const pendingRequestCount = requests.incoming.length;

  return (
    <SocialContext.Provider value={{
      // State
      friends,
      requests,
      blocked,
      onlineUsers,
      loading,
      pendingRequestCount,
      // Setters (for advanced usage)
      setFriends,
      setRequests,
      setBlocked,
      // Actions
      fetchAll,
      sendFriendRequest,
      acceptRequest,
      rejectRequest,
      cancelRequest,
      removeFriend,
      blockUser,
      unblockUser,
    }}>
      {children}
    </SocialContext.Provider>
  );
};

export const useSocial = () => {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used inside <SocialProvider>');
  return context;
};