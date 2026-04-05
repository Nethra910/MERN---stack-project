import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import API from '../api/axios';
import { chatApi } from '../api/chatApi';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations]         = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages]                   = useState([]);
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

  // ─── Ref so socket handlers always see latest conversation ──
  const currentConversationRef = useRef(null);
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

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

    // Incoming new message
    newSocket.on('receive-message', (data) => {
      if (data.conversationId === currentConversationRef.current?._id) {
        setMessages((prev) => {
          // Avoid duplicates (in case sender's own REST response already added it)
          if (prev.some((m) => m._id === data._id)) return prev;
          return [...prev, data];
        });
      }
      fetchConversations();
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

  // ─── Fetch messages ────────────────────────────────
  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const response = await API.get(`/chat/conversations/${conversationId}/messages?limit=50`);
      setMessages(response?.data?.data?.messages || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    }
  }, []);

  // ─── Create conversation ───────────────────────────
  const createConversation = useCallback(async (participantIds) => {
    try {
      const response = await API.post('/chat/conversations', { participantIds });
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};