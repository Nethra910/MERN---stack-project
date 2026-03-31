import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  searchUsers,
  deleteConversation,
  addParticipant,
  removeParticipant,
} from '../controllers/chatController.js';

const router = express.Router();

// ✅ All routes are protected
router.use(protect);

// Conversation routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.delete('/conversations/:conversationId', deleteConversation);

// Message routes
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.put('/conversations/:conversationId/read', markAsRead);

// Search route
router.get('/search/:query', searchUsers);

// Group management routes
router.post('/conversations/:conversationId/participants', addParticipant);
router.delete('/conversations/:conversationId/participants', removeParticipant);

export default router;