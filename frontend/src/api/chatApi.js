import API from './axios';

export const chatApi = {
  // Conversations
  getConversations: () => API.get('/chat/conversations'),
  createConversation: (participantIds) => API.post('/chat/conversations', { participantIds }),
  deleteConversation: (id) => API.delete(`/chat/conversations/${id}`),

  // Messages
  getMessages: (conversationId, limit = 50, skip = 0) =>
    API.get(`/chat/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`),
  sendMessage: (conversationId, content) =>
    API.post(`/chat/conversations/${conversationId}/messages`, { content }),
  markAsRead: (conversationId) => API.put(`/chat/conversations/${conversationId}/read`),

  // Search
  searchUsers: (query) => API.get(`/chat/search/${query}`),
};