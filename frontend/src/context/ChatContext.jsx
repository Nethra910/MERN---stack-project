import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import * as chatApi from '../api/chatApi.js';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  // Initialize socket
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('users:online', (userIds) => {
      setOnlineUsers(userIds);
    });

    socket.on('user:online', ({ userId }) => {
      setOnlineUsers((prev) => [...new Set([...prev, userId])]);
    });

    socket.on('user:offline', ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((id) => id !== userId));
    });

    socket.on('message:new', (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === message.conversation
            ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
            : conv
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    });

    socket.on('typing:start', ({ conversationId, userId, userName }) => {
      setTypingUsers((prev) => ({ ...prev, [conversationId]: { userId, userName } }));
    });

    socket.on('typing:stop', ({ conversationId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await chatApi.getConversations();
      setConversations(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectConversation = useCallback(async (conversation) => {
    if (activeConversation?._id === conversation._id) return;

    // Leave previous room
    if (activeConversation && socketRef.current) {
      socketRef.current.emit('conversation:leave', activeConversation._id);
    }

    setActiveConversation(conversation);
    setMessages([]);

    try {
      const res = await chatApi.getMessages(conversation._id);
      setMessages(res.data.data);
      await chatApi.markAsRead(conversation._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load messages');
    }

    // Join new room
    if (socketRef.current) {
      socketRef.current.emit('conversation:join', conversation._id);
    }
  }, [activeConversation]);

  const sendMessage = useCallback(async (content) => {
    if (!activeConversation || !content.trim()) return;

    try {
      const res = await chatApi.sendMessage(activeConversation._id, content);
      const message = res.data.data;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === activeConversation._id
            ? { ...conv, lastMessage: message, updatedAt: new Date().toISOString() }
            : conv
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );

      // Emit to socket for real-time delivery
      if (socketRef.current) {
        socketRef.current.emit('message:send', {
          conversationId: activeConversation._id,
          message,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  }, [activeConversation]);

  const startTyping = useCallback(() => {
    if (!activeConversation || !socketRef.current) return;
    socketRef.current.emit('typing:start', { conversationId: activeConversation._id });
  }, [activeConversation]);

  const stopTyping = useCallback(() => {
    if (!activeConversation || !socketRef.current) return;
    socketRef.current.emit('typing:stop', { conversationId: activeConversation._id });
  }, [activeConversation]);

  const createConversation = useCallback(async (data) => {
    try {
      const res = await chatApi.createConversation(data);
      const conversation = res.data.data;
      setConversations((prev) => {
        if (prev.some((c) => c._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
      return conversation;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation');
      return null;
    }
  }, []);

  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await chatApi.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete conversation');
    }
  }, [activeConversation]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        onlineUsers,
        typingUsers,
        loading,
        error,
        currentUser,
        fetchConversations,
        selectConversation,
        sendMessage,
        startTyping,
        stopTyping,
        createConversation,
        deleteConversation,
        setError,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used inside ChatProvider');
  return ctx;
};

export default ChatContext;
