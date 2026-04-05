import API from './axios';

export const chatApi = {
  // ─── Conversations ─────────────────────────────────
  getConversations: () => API.get('/chat/conversations'),
  createConversation: (participantIds) =>
    API.post('/chat/conversations', { participantIds }),
  deleteConversation: (id) => API.delete(`/chat/conversations/${id}`),

  // ─── Messages ──────────────────────────────────────
  getMessages: (conversationId, limit = 50, skip = 0) =>
    API.get(`/chat/conversations/${conversationId}/messages?limit=${limit}&skip=${skip}`),
  sendMessage: (conversationId, content, replyToId = null) =>
    API.post(`/chat/conversations/${conversationId}/messages`, { content, replyToId }),
  markAsRead: (conversationId) =>
    API.put(`/chat/conversations/${conversationId}/read`),

  // ─── NEW: Message actions ──────────────────────────
  editMessage: (messageId, content) =>
    API.patch(`/chat/messages/${messageId}`, { content }),
  deleteMessage: (messageId, deleteFor = 'everyone') =>
    API.delete(`/chat/messages/${messageId}`, { data: { deleteFor } }),
  reactToMessage: (messageId, emoji) =>
    API.post(`/chat/messages/${messageId}/react`, { emoji }),
  forwardMessage: (messageId, targetConversationIds) =>
    API.post(`/chat/messages/${messageId}/forward`, { targetConversationIds }),

  // ─── NEW: Search messages ──────────────────────────
  searchMessages: (conversationId, q) =>
    API.get(`/chat/conversations/${conversationId}/search?q=${encodeURIComponent(q)}`),

  // ─── User search ───────────────────────────────────
  searchUsers: (query) => API.get(`/chat/search/${query}`),
};