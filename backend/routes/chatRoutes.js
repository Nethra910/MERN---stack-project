import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { uploadChatMedia, uploadVoiceMessage, handleMulterError } from '../middleware/uploadMiddleware.js';
import {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  sendMediaMessage,
  sendVoiceMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  forwardMessage,
  searchMessages,
  markAsRead,
  getUnreadCounts,
  pinConversation,
  unpinConversation,
  searchUsers,
  deleteConversation,
  addParticipant,
  removeParticipant,
  updateGroupRules,
  createInviteLink,
  revokeInviteLink,
  joinViaInvite,
  listJoinRequests,
  respondJoinRequest,
  setGroupRole,
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from '../controllers/chatController.js';

const router = express.Router();

// All routes protected
router.use(protect);

// ─── Conversation routes ───────────────────────────────
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.delete('/conversations/:conversationId', deleteConversation);

// ─── Unread counts ─────────────────────────────────────
router.get('/unread', getUnreadCounts);

// ─── Message routes ────────────────────────────────────
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);
router.post('/conversations/:conversationId/media', uploadChatMedia, handleMulterError, sendMediaMessage);
router.post('/conversations/:conversationId/voice', uploadVoiceMessage, handleMulterError, sendVoiceMessage);
router.put('/conversations/:conversationId/read', markAsRead);

// ─── Pin/Unpin conversations ───────────────────────────
router.post('/conversations/:conversationId/pin', pinConversation);
router.delete('/conversations/:conversationId/pin', unpinConversation);

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
router.put('/conversations/:conversationId/rules', updateGroupRules);
router.post('/conversations/:conversationId/invites', createInviteLink);
router.delete('/conversations/:conversationId/invites/:code', revokeInviteLink);
router.post('/conversations/invites/:code/join', joinViaInvite);
router.get('/conversations/:conversationId/join-requests', listJoinRequests);
router.post('/conversations/:conversationId/join-requests/:requestId', respondJoinRequest);
router.post('/conversations/:conversationId/roles', setGroupRole);
router.post('/conversations/:conversationId/pins/:messageId', pinMessage);
router.delete('/conversations/:conversationId/pins/:messageId', unpinMessage);
router.get('/conversations/:conversationId/pins', getPinnedMessages);

export default router;