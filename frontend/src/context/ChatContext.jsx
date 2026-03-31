import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import API from '../api/axios';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user') || '{}';
    const userId = JSON.parse(userStr)._id;

    if (!token || !userId) return;

    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001', {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to chat server');
      newSocket.emit('user-online', userId);
    });

    newSocket.on('receive-message', (data) => {
      if (data.conversationId === currentConversation?._id) {
        setMessages((prev) => [...prev, data]);
      }
    });

    newSocket.on('user-typing', ({ conversationId, userId: typingUserId }) => {
      if (conversationId === currentConversation?._id && typingUserId !== userId) {
        setTypingUsers((prev) => new Set([...prev, typingUserId]));
      }
    });

    newSocket.on('user-stop-typing', ({ conversationId }) => {
      if (conversationId === currentConversation?._id) {
        setTypingUsers(new Set());
      }
    });

    newSocket.on('user-status', ({ userId: onlineUserId }) => {
      setOnlineUsers((prev) => new Set([...prev, onlineUserId]));
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/chat/conversations');
      setConversations(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const response = await API.get(`/chat/conversations/${conversationId}/messages?limit=50`);
      setMessages(response.data.data.messages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    }
  }, []);

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

  const sendMessage = useCallback(async (content) => {
    if (!currentConversation || !content.trim()) return;

    try {
      const response = await API.post(
        `/chat/conversations/${currentConversation._id}/messages`,
        { content }
      );

      socket?.emit('send-message', {
        conversationId: currentConversation._id,
        senderId: JSON.parse(localStorage.getItem('user') || '{}')._id,
        content,
      });

      setMessages((prev) => [...prev, response.data.data]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    }
  }, [currentConversation, socket]);

  const value = {
    conversations,
    currentConversation,
    setCurrentConversation,
    messages,
    socket,
    onlineUsers,
    typingUsers,
    loading,
    error,
    setError,
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};