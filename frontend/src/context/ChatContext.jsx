import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import API from '../api/axios';
import { chatApi } from '../api/chatApi';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations]         = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages]                   = useState([]);
  const [messagesLoadedFor, setMessagesLoadedFor] = useState(null);
  const [messagesLoadedCount, setMessagesLoadedCount] = useState(null);
  const [socket, setSocket]                       = useState(null);
  const [onlineUsers, setOnlineUsers]             = useState(new Set());
  const [typingUsers, setTypingUsers]             = useState(new Set());
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState('');

  // ─── New feature state ────────────────────────────
  const [replyingTo, setReplyingTo]               = useState(null);   // message being replied to
  const [editingMessage, setEditingMessage]       = useState(null);   // message being edited
  const [searchQuery, setSearchQuery]             = useState('');
  const [searchResults, setSearchResults]         = useState([]);
  const [searchLoading, setSearchLoading]         = useState(false);
  const [forwardModalOpen, setForwardModalOpen]   = useState(false);
  const [messageToForward, setMessageToForward]   = useState(null);

  // ─── Pagination state ────────────────────────────
  const [hasMoreMessages, setHasMoreMessages]     = useState(true);
  const [isLoadingMore, setIsLoadingMore]         = useState(false);
  const [messageSkip, setMessageSkip]             = useState(0);
  const MESSAGE_LIMIT = 50;

  // ─── Unread counts & pins ────────────────────────
  const [unreadCounts, setUnreadCounts]           = useState({});
  const [totalUnread, setTotalUnread]             = useState(0);

  // ─── Invite banner ───────────────────────────────
  const [inviteBanner, setInviteBanner]           = useState(null);

  // ─── Group feature state ─────────────────────────
  const [pinnedMessages, setPinnedMessages]       = useState([]);
  const [pinnedLoading, setPinnedLoading]         = useState(false);
  const [joinRequests, setJoinRequests]           = useState([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [latestInviteCode, setLatestInviteCode]   = useState('');

  // ─── Notification preference (persisted) ────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notificationsEnabled');
    return saved !== null ? saved === 'true' : true; // Default to enabled
  });

  // ─── Ref so socket handlers always see latest conversation ──
  const currentConversationRef = useRef(null);
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  // ─── Ref for notification preference (for socket handler) ──
  const notificationsEnabledRef = useRef(notificationsEnabled);
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
    localStorage.setItem('notificationsEnabled', String(notificationsEnabled));
  }, [notificationsEnabled]);

  // ─── Toggle notifications ──────────────────────────
  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => !prev);
  }, []);

  // ─── Socket setup (created once) ──────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const parsedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = parsedUser.id || parsedUser._id;

    if (!token || !userId) return;

    const newSocket = io(
      import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001',
      { auth: { token }, reconnection: true, reconnectionAttempts: 5 }
    );

    newSocket.on('connect', () => newSocket.emit('user-online', userId));

    // Request notification permission on connect
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Incoming new message
    newSocket.on('receive-message', (data) => {
      if (data.conversationId === currentConversationRef.current?._id) {
        setMessages((prev) => {
          // Avoid duplicates (in case sender's own REST response already added it)
          if (prev.some((m) => m._id === data._id)) return prev;
          return [...prev, data];
        });
      } else {
        // Show browser notification for messages in other conversations
        // Only if user has enabled notifications AND browser permission is granted
        if (
          notificationsEnabledRef.current &&
          'Notification' in window && 
          Notification.permission === 'granted' && 
          document.hidden
        ) {
          const senderName = data.senderId?.name || 'Someone';
          const content = data.content || 'Sent a message';
          new Notification(`New message from ${senderName}`, {
            body: content.slice(0, 100),
            icon: '/favicon.ico',
            tag: data.conversationId, // Prevent duplicate notifications
          });
        }
      }
      fetchConversations();
      fetchUnreadCounts();
    });

    // ─── NEW: Edit ─────────────────────────────────
    newSocket.on('message-edited', ({ messageId, content, editedAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, content, isEdited: true, editedAt } : m
        )
      );
    });

    // ─── NEW: Delete ───────────────────────────────
    newSocket.on('message-deleted', ({ messageId, deleteFor, deletedBy }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                isDeleted: deleteFor === 'everyone',
                content: deleteFor === 'everyone' ? 'This message was deleted' : m.content,
                deleteType: deleteFor,
                deletedBy: deletedBy || m.deletedBy || [],
              }
            : m
        )
      );
    });

    // ─── NEW: React ────────────────────────────────
    newSocket.on('message-reacted', ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    });

    // Typing
    newSocket.on('user-typing', ({ conversationId, userId: typingUserId }) => {
      if (
        conversationId === currentConversationRef.current?._id &&
        String(typingUserId) !== String(userId)
      ) {
        setTypingUsers((prev) => new Set([...prev, String(typingUserId)]));
      }
    });

    newSocket.on('user-stop-typing', ({ conversationId, userId: stopId }) => {
      if (conversationId === currentConversationRef.current?._id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          stopId ? next.delete(String(stopId)) : next.clear();
          return next;
        });
      }
    });

    // Online status
    newSocket.on('user-status', ({ userId: statusUserId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        status === 'online' ? next.add(String(statusUserId)) : next.delete(String(statusUserId));
        return next;
      });
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch conversations ───────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/chat/conversations');
      setConversations(response?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Fetch unread counts ───────────────────────────
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const response = await chatApi.getUnreadCounts();
      const data = response?.data?.data;
      setUnreadCounts(data?.unreadCounts || {});
      setTotalUnread(data?.totalUnread || 0);
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  }, []);

  // ─── Mark conversation as read ─────────────────────
  const markConversationAsRead = useCallback(async (conversationId) => {
    try {
      await chatApi.markAsRead(conversationId);
      // Update local state
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[conversationId];
        return newCounts;
      });
      setTotalUnread(prev => Math.max(0, prev - (unreadCounts[conversationId] || 0)));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [unreadCounts]);

  // ─── Pin/Unpin conversation ────────────────────────
  const pinConversation = useCallback(async (conversationId) => {
    try {
      await chatApi.pinConversation(conversationId);
      fetchConversations(); // Refresh to get updated pinnedBy
    } catch (err) {
      console.error('Failed to pin conversation:', err);
    }
  }, [fetchConversations]);

  const unpinConversation = useCallback(async (conversationId) => {
    try {
      await chatApi.unpinConversation(conversationId);
      fetchConversations(); // Refresh to get updated pinnedBy
    } catch (err) {
      console.error('Failed to unpin conversation:', err);
    }
  }, [fetchConversations]);

  // ─── Group: rules ─────────────────────────────────
  const updateGroupRules = useCallback(async (conversationId, text) => {
    try {
      const response = await chatApi.updateGroupRules(conversationId, text);
      const rules = response?.data?.data;
      setCurrentConversation((prev) =>
        prev && String(prev._id) === String(conversationId)
          ? { ...prev, groupRules: rules }
          : prev
      );
      fetchConversations();
      return rules;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update group rules');
      throw err;
    }
  }, [fetchConversations]);

  // ─── Group: invites ───────────────────────────────
  const createInviteLink = useCallback(async (conversationId, payload = {}) => {
    try {
      const response = await chatApi.createInviteLink(conversationId, payload);
      const code = response?.data?.data?.code || '';
      setLatestInviteCode(code);
      return code;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invite link');
      throw err;
    }
  }, []);

  const revokeInviteLink = useCallback(async (conversationId, code) => {
    try {
      await chatApi.revokeInviteLink(conversationId, code);
      if (latestInviteCode === code) setLatestInviteCode('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke invite link');
      throw err;
    }
  }, [latestInviteCode]);

  const joinViaInvite = useCallback(async (code) => {
    try {
      const response = await chatApi.joinViaInvite(code);
      fetchConversations();
      return response?.data?.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join via invite');
      throw err;
    }
  }, [fetchConversations]);

  // ─── Group: join requests ─────────────────────────
  const fetchJoinRequests = useCallback(async (conversationId) => {
    try {
      setJoinRequestsLoading(true);
      const response = await chatApi.listJoinRequests(conversationId);
      setJoinRequests(response?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load join requests');
    } finally {
      setJoinRequestsLoading(false);
    }
  }, []);

  const respondToJoinRequest = useCallback(async (conversationId, requestId, action) => {
    try {
      await chatApi.respondJoinRequest(conversationId, requestId, action);
      fetchJoinRequests(conversationId);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond to join request');
      throw err;
    }
  }, [fetchJoinRequests, fetchConversations]);

  // ─── Group: roles ─────────────────────────────────
  const setGroupRole = useCallback(async (conversationId, targetUserId, role) => {
    try {
      await chatApi.setGroupRole(conversationId, targetUserId, role);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
      throw err;
    }
  }, [fetchConversations]);

  // ─── Group: pins ─────────────────────────────────-
  const fetchPinnedMessages = useCallback(async (conversationId) => {
    try {
      setPinnedLoading(true);
      const response = await chatApi.getPinnedMessages(conversationId);
      setPinnedMessages(response?.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pinned messages');
    } finally {
      setPinnedLoading(false);
    }
  }, []);

  const pinMessage = useCallback(async (conversationId, messageId) => {
    try {
      await chatApi.pinMessage(conversationId, messageId);
      fetchPinnedMessages(conversationId);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to pin message');
      throw err;
    }
  }, [fetchPinnedMessages, fetchConversations]);

  const unpinMessage = useCallback(async (conversationId, messageId) => {
    try {
      await chatApi.unpinMessage(conversationId, messageId);
      fetchPinnedMessages(conversationId);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unpin message');
      throw err;
    }
  }, [fetchPinnedMessages, fetchConversations]);

  // ─── Fetch messages ────────────────────────────────
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const response = await API.get(`/chat/conversations/${conversationId}/messages?limit=${MESSAGE_LIMIT}`);
      const data = response?.data?.data;
      const nextMessages = data?.messages || [];
      setMessages(nextMessages);
      setMessagesLoadedFor(String(conversationId));
      setMessagesLoadedCount(nextMessages.length);
      setMessageSkip(MESSAGE_LIMIT);
      setHasMoreMessages((data?.messages?.length || 0) >= MESSAGE_LIMIT);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    }
  }, []);

  // ─── Load more messages (pagination) ───────────────
  const loadMoreMessages = useCallback(async () => {
    const conv = currentConversationRef.current;
    if (!conv || isLoadingMore || !hasMoreMessages) return;

    setIsLoadingMore(true);
    try {
      const response = await API.get(
        `/chat/conversations/${conv._id}/messages?limit=${MESSAGE_LIMIT}&skip=${messageSkip}`
      );
      const data = response?.data?.data;
      const olderMessages = data?.messages || [];
      
      if (olderMessages.length > 0) {
        // Prepend older messages (they come in ascending order, so they go before current)
        setMessages((prev) => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m._id));
          const newMessages = olderMessages.filter(m => !existingIds.has(m._id));
          return [...newMessages, ...prev];
        });
        setMessageSkip(prev => prev + olderMessages.length);
      }
      
      setHasMoreMessages(olderMessages.length >= MESSAGE_LIMIT);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMessages, messageSkip]);

  // ─── Create conversation ───────────────────────────
  const createConversation = useCallback(async (participantIds, options = {}) => {
    try {
      const response = await chatApi.createConversation(participantIds, options);
      setConversations((prev) => [response.data.data, ...prev]);
      setCurrentConversation(response.data.data);
      setMessages([]);
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation');
    }
  }, []);

  // ─── Send message ──────────────────────────────────
  const sendMessage = useCallback(async (content) => {
    const conv = currentConversationRef.current;
    if (!conv || !content.trim()) return;

    try {
      const parsedSender = JSON.parse(localStorage.getItem('user') || '{}');
      const senderId = parsedSender.id || parsedSender._id;

      const response = await chatApi.sendMessage(conv._id, content, replyingTo?._id || null);
      const savedMessage = response.data.data;

      // Add from REST response (single source of truth for sender)
      setMessages((prev) => [...prev, savedMessage]);
      setReplyingTo(null);

      socket?.emit('send-message', {
        conversationId: conv._id,
        senderId,
        content,
        messageId: savedMessage._id,
        replyTo: savedMessage.replyTo || null,
      });

      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  }, [socket, fetchConversations, replyingTo]);

  // ─── Send media message ─────────────────────────────
  const sendMediaMessage = useCallback(async (files, content = '') => {
    const conv = currentConversationRef.current;
    if (!conv || files.length === 0) return;

    try {
      const parsedSender = JSON.parse(localStorage.getItem('user') || '{}');
      const senderId = parsedSender.id || parsedSender._id;

      const response = await chatApi.sendMediaMessage(conv._id, files, content, replyingTo?._id || null);
      const savedMessage = response.data.data;

      // Add from REST response
      setMessages((prev) => [...prev, savedMessage]);
      setReplyingTo(null);

      socket?.emit('send-message', {
        conversationId: conv._id,
        senderId,
        content: content || (savedMessage.attachments?.length > 1 ? '📎 Media' : savedMessage.attachments?.[0]?.type === 'video' ? '🎥 Video' : '📷 Photo'),
        messageId: savedMessage._id,
        replyTo: savedMessage.replyTo || null,
        attachments: savedMessage.attachments,
      });

      fetchConversations();
      return savedMessage;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send media');
      throw err;
    }
  }, [socket, fetchConversations, replyingTo]);

  // ─── Send voice message ─────────────────────────────
  const sendVoiceMessage = useCallback(async (audioBlob, duration) => {
    const conv = currentConversationRef.current;
    if (!conv || !audioBlob) return;

    try {
      const parsedSender = JSON.parse(localStorage.getItem('user') || '{}');
      const senderId = parsedSender.id || parsedSender._id;

      const response = await chatApi.sendVoiceMessage(conv._id, audioBlob, duration);
      const savedMessage = response.data.data;

      // Add from REST response
      setMessages((prev) => [...prev, savedMessage]);

      socket?.emit('send-message', {
        conversationId: conv._id,
        senderId,
        content: '🎤 Voice message',
        messageId: savedMessage._id,
        attachments: savedMessage.attachments,
      });

      fetchConversations();
      return savedMessage;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send voice message');
      throw err;
    }
  }, [socket, fetchConversations]);

  // ─── NEW: Edit message ─────────────────────────────
  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      const response = await chatApi.editMessage(messageId, newContent);
      const updated = response.data.data;

      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? updated : m))
      );
      setEditingMessage(null);

      socket?.emit('edit-message', {
        conversationId: currentConversationRef.current?._id,
        messageId,
        content: updated.content,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to edit message');
    }
  }, [socket]);

  // ─── NEW: Delete message ───────────────────────────
  const deleteMessage = useCallback(async (messageId, deleteFor = 'everyone') => {
    try {
      const response = await chatApi.deleteMessage(messageId, deleteFor);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserId = user.id || user._id;

      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                isDeleted: deleteFor === 'everyone',
                content: deleteFor === 'everyone' ? 'This message was deleted' : m.content,
                deleteType: deleteFor,
                deletedBy: deleteFor === 'self' 
                  ? [...(m.deletedBy || []), currentUserId]
                  : m.deletedBy || [],
              }
            : m
        )
      );

      socket?.emit('delete-message', {
        conversationId: currentConversationRef.current?._id,
        messageId,
        deleteFor,
        deletedBy: deleteFor === 'self' ? [currentUserId] : undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message');
    }
  }, [socket]);

  // ─── NEW: React to message ─────────────────────────
  const reactToMessage = useCallback(async (messageId, emoji) => {
    try {
      const response = await chatApi.reactToMessage(messageId, emoji);
      const { reactions } = response.data.data;

      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );

      socket?.emit('react-message', {
        conversationId: currentConversationRef.current?._id,
        messageId,
        reactions,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to react');
    }
  }, [socket]);

  // ─── NEW: Forward message ──────────────────────────
  const forwardMessage = useCallback(async (messageId, targetConversationIds) => {
    try {
      const response = await chatApi.forwardMessage(messageId, targetConversationIds);
      const forwardedMessages = response.data.data;

      socket?.emit('forward-message', {
        targetConversationIds,
        message: forwardedMessages[0],
      });

      setForwardModalOpen(false);
      setMessageToForward(null);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to forward message');
    }
  }, [socket, fetchConversations]);

  // ─── NEW: Search messages ──────────────────────────
  const searchInConversation = useCallback(async (q) => {
    const conv = currentConversationRef.current;
    if (!conv || !q.trim()) { setSearchResults([]); return; }
    try {
      setSearchLoading(true);
      const response = await chatApi.searchMessages(conv._id, q);
      setSearchResults(response.data.data.results || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const value = {
    // Existing
    conversations, currentConversation, setCurrentConversation,
    messages, socket, onlineUsers, typingUsers, loading, error, setError,
    fetchConversations, fetchMessages, createConversation, sendMessage,
    sendMediaMessage, sendVoiceMessage,

    // Pagination
    hasMoreMessages, isLoadingMore, loadMoreMessages,

    // Unread & Pin
    unreadCounts, totalUnread, fetchUnreadCounts, markConversationAsRead,
    pinConversation, unpinConversation,

    // Group features
    updateGroupRules,
    createInviteLink,
    revokeInviteLink,
    joinViaInvite,
    fetchJoinRequests,
    respondToJoinRequest,
    setGroupRole,
    pinnedMessages,
    pinnedLoading,
    fetchPinnedMessages,
    pinMessage,
    unpinMessage,
    joinRequests,
    joinRequestsLoading,
    latestInviteCode,
    setLatestInviteCode,

    // Invite banner
    inviteBanner,
    setInviteBanner,

    // New feature state
    replyingTo, setReplyingTo,
    editingMessage, setEditingMessage,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    searchLoading,
    forwardModalOpen, setForwardModalOpen,
    messageToForward, setMessageToForward,

    // New feature actions
    editMessage,
    deleteMessage,
    reactToMessage,
    forwardMessage,
    searchInConversation,

    // Notification preference
    notificationsEnabled,
    toggleNotifications,

    // Message load tracking
    messagesLoadedFor,
    messagesLoadedCount,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};