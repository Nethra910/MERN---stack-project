import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import API from '../api/axios';
import useSocket from '../hooks/useSocket';
import toast from 'react-hot-toast';

const ChatRequestContext = createContext();

export const ChatRequestProvider = ({ children }) => {
  const { socket } = useSocket();

  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [blockedUsers, setBlockedUsers]         = useState([]);
  const [loading, setLoading]                   = useState(false);

  const incomingRef = useRef(incomingRequests);
  useEffect(() => { incomingRef.current = incomingRequests; }, [incomingRequests]);

  // ─── Fetch all requests + blocked list ───────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, blockRes] = await Promise.all([
        API.get('/chat-requests/my'),
        API.get('/chat-requests/blocked'),
      ]);
      setIncomingRequests(reqRes.data.data?.incoming || []);
      setOutgoingRequests(reqRes.data.data?.outgoing || []);
      setBlockedUsers(blockRes.data.data || []);
    } catch (err) {
      console.error('fetchRequests error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ─── Socket listeners ────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onRequestReceived = ({ request }) => {
      setIncomingRequests(prev => {
        if (prev.some(r => r._id === request._id)) return prev;
        return [request, ...prev];
      });
      toast.success(`${request.senderId?.name || 'Someone'} wants to chat with you!`, {
        icon: '💬',
        duration: 5000,
      });
    };

    const onRequestAccepted = ({ requestId }) => {
      setOutgoingRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Chat request accepted! You can now message each other.', { icon: '✅' });
    };

    const onRequestRejected = ({ requestId }) => {
      setOutgoingRequests(prev => prev.filter(r => r._id !== requestId));
      toast('Your chat request was declined.', { icon: '❌' });
    };

    const onRequestCancelled = ({ requestId }) => {
      setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
    };

    // When the other party deletes the request, clear it from whichever
    // list it lives in on our side so the UI resets immediately.
    const onRequestDeleted = ({ requestId }) => {
      const id = String(requestId);
      setIncomingRequests(prev => prev.filter(r => r._id !== id));
      setOutgoingRequests(prev => prev.filter(r => r._id !== id));
    };

    const onBlockedBy = () => {};

    socket.on('chat_request_received',  onRequestReceived);
    socket.on('chat_request_accepted',  onRequestAccepted);
    socket.on('chat_request_rejected',  onRequestRejected);
    socket.on('chat_request_cancelled', onRequestCancelled);
    socket.on('chat_request_deleted',   onRequestDeleted);
    socket.on('user_blocked_by',        onBlockedBy);

    return () => {
      socket.off('chat_request_received',  onRequestReceived);
      socket.off('chat_request_accepted',  onRequestAccepted);
      socket.off('chat_request_rejected',  onRequestRejected);
      socket.off('chat_request_cancelled', onRequestCancelled);
      socket.off('chat_request_deleted',   onRequestDeleted);
      socket.off('user_blocked_by',        onBlockedBy);
    };
  }, [socket]);

  // ─── Send request ─────────────────────────────────────
  const sendRequest = useCallback(async (receiverId) => {
    try {
      const res = await API.post('/chat-requests/send', { receiverId });
      const data = res.data.data;

      if (data?.status === 'accepted') {
        toast.success('You are now connected!', { icon: '🎉' });
        return { status: 'accepted', conversation: data.conversation };
      }

      setOutgoingRequests(prev => [data, ...prev]);
      toast.success('Chat request sent!', { icon: '📤' });
      return { status: 'pending' };
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send request';
      toast.error(msg);
      throw err;
    }
  }, []);

  // ─── Accept request ───────────────────────────────────
  const acceptRequest = useCallback(async (requestId) => {
    try {
      const res = await API.post('/chat-requests/accept', { requestId });
      setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Chat request accepted!', { icon: '✅' });
      return res.data.data; // { conversationId, conversation }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept request');
      throw err;
    }
  }, []);

  // ─── Reject request ───────────────────────────────────
  const rejectRequest = useCallback(async (requestId) => {
    try {
      await API.post('/chat-requests/reject', { requestId });
      setIncomingRequests(prev => prev.filter(r => r._id !== requestId));
      toast('Request declined.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject request');
    }
  }, []);

  // ─── Cancel outgoing pending request ──────────────────
  const cancelRequest = useCallback(async (requestId) => {
    try {
      await API.post('/chat-requests/cancel', { requestId });
      setOutgoingRequests(prev => prev.filter(r => r._id !== requestId));
      toast('Request cancelled.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel request');
    }
  }, []);

  // ─── Delete by requestId ──────────────────────────────
  // Works for any status. Either sender or receiver can call this.
  // After deletion, a fresh request can be sent immediately.
  const deleteRequest = useCallback(async (requestId) => {
    try {
      await API.delete(`/chat-requests/${requestId}`);
      const id = String(requestId);
      setIncomingRequests(prev => prev.filter(r => r._id !== id));
      setOutgoingRequests(prev => prev.filter(r => r._id !== id));
      toast('Request deleted. You can send a new one anytime.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete request');
      throw err;
    }
  }, []);

  // ─── Delete by the other user's ID ───────────────────
  // Easier to call from UI — just pass the other person's userId.
  // Backend finds whichever direction the request exists in.
  const deleteRequestByUser = useCallback(async (targetUserId) => {
    try {
      await API.delete(`/chat-requests/with/${targetUserId}`);
      // Optimistically remove from whichever list contains this user
      setIncomingRequests(prev =>
        prev.filter(r => String(r.senderId?._id || r.senderId) !== String(targetUserId))
      );
      setOutgoingRequests(prev =>
        prev.filter(r => String(r.receiverId?._id || r.receiverId) !== String(targetUserId))
      );
      toast('Request deleted. You can send a new one anytime.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete request');
      throw err;
    }
  }, []);

  // ─── Block user ───────────────────────────────────────
  const blockUser = useCallback(async (targetUserId) => {
    try {
      await API.post(`/chat-requests/block/${targetUserId}`);
      await fetchRequests();
      toast('User blocked.', { icon: '🚫' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to block user');
    }
  }, [fetchRequests]);

  // ─── Unblock user ─────────────────────────────────────
  const unblockUser = useCallback(async (targetUserId) => {
    try {
      await API.post(`/chat-requests/unblock/${targetUserId}`);
      setBlockedUsers(prev => prev.filter(u => u._id !== targetUserId));
      toast('User unblocked.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to unblock user');
    }
  }, []);

  // ─── Get connection status with a specific user ───────
  const getConnectionStatus = useCallback(async (targetUserId) => {
    try {
      const res = await API.get(`/chat-requests/status/${targetUserId}`);
      return res.data.data; // { status, requestId, conversationId }
    } catch {
      return { status: 'none', requestId: null, conversationId: null };
    }
  }, []);

  const isBlocked = useCallback((userId) => {
    return blockedUsers.some(u => u._id === userId);
  }, [blockedUsers]);

  const pendingCount = incomingRequests.length;

  return (
    <ChatRequestContext.Provider value={{
      incomingRequests,
      outgoingRequests,
      blockedUsers,
      loading,
      pendingCount,
      fetchRequests,
      sendRequest,
      acceptRequest,
      rejectRequest,
      cancelRequest,
      deleteRequest,
      deleteRequestByUser,
      blockUser,
      unblockUser,
      getConnectionStatus,
      isBlocked,
    }}>
      {children}
    </ChatRequestContext.Provider>
  );
};

export const useChatRequest = () => {
  const ctx = useContext(ChatRequestContext);
  if (!ctx) throw new Error('useChatRequest must be used inside <ChatRequestProvider>');
  return ctx;
};