import api from './axios.js';

export const getConversations = () => api.get('/chat/conversations');

export const createConversation = (data) => api.post('/chat/conversations', data);

export const getMessages = (conversationId, page = 1) =>
  api.get(`/chat/conversations/${conversationId}/messages?page=${page}`);

export const sendMessage = (conversationId, content) =>
  api.post(`/chat/conversations/${conversationId}/messages`, { content });

export const markAsRead = (conversationId) =>
  api.patch(`/chat/conversations/${conversationId}/read`);

export const searchUsers = (q) => api.get(`/chat/users/search?q=${encodeURIComponent(q)}`);

export const deleteConversation = (conversationId) =>
  api.delete(`/chat/conversations/${conversationId}`);

export const addParticipant = (conversationId, userId) =>
  api.post(`/chat/conversations/${conversationId}/participants`, { userId });

export const removeParticipant = (conversationId, userId) =>
  api.delete(`/chat/conversations/${conversationId}/participants/${userId}`);
