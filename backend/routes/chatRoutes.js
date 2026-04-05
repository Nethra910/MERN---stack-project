import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  forwardMessage,
  searchMessages,
  markAsRead,
  searchUsers,
  deleteConversation,
  addParticipant,
  removeParticipant,
} from '../controllers/chatController.js';

const router = express.Router();

// All routes protected
router.use(protect);

// ─── Conversation routes ───────────────────────────────
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.delete('/conversations/:conversationId', deleteConversation);

// ─── Message routes ────────────────────────────────────
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.put('/conversations/:conversationId/read', markAsRead);

// ─── Message search ────────────────────────────────────
router.get('/conversations/:conversationId/search', searchMessages);

// ─── Message actions (edit, delete, react, forward) ───
router.patch('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/react', reactToMessage);
router.post('/messages/:messageId/forward', forwardMessage);

// ─── User search ───────────────────────────────────────
router.get('/search/:query', searchUsers);

// ─── Group management ──────────────────────────────────
router.post('/conversations/:conversationId/participants', addParticipant);
router.delete('/conversations/:conversationId/participants', removeParticipant);

export default router;