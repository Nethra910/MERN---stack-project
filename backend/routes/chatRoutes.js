import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
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

router.use(protect);

router.get('/users/search', searchUsers);
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/read', markAsRead);
router.delete('/conversations/:id', deleteConversation);
router.post('/conversations/:id/participants', addParticipant);
router.delete('/conversations/:id/participants/:userId', removeParticipant);

export default router;
