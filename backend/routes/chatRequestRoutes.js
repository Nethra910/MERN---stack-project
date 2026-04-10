import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  sendChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  cancelChatRequest,
  deleteChatRequest,
  deleteChatRequestByUser,
  getMyRequests,
  getConnectionStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../controllers/chatRequestController.js';

const router = express.Router();

router.use(protect);

// ─── Core request lifecycle ────────────────────────────
router.post('/send',   sendChatRequest);
router.post('/accept', acceptChatRequest);
router.post('/reject', rejectChatRequest);
router.post('/cancel', cancelChatRequest);   // cancel your own PENDING request

// ─── Delete (works for any status, either party) ───────
// Option A: delete by requestId
router.delete('/:requestId', deleteChatRequest);

// Option B: delete by the other user's ID (easier for frontend)
router.delete('/with/:targetUserId', deleteChatRequestByUser);

// ─── Query ─────────────────────────────────────────────
router.get('/my',                getMyRequests);
router.get('/status/:targetUserId', getConnectionStatus);

// ─── Block ─────────────────────────────────────────────
router.post('/block/:targetUserId',   blockUser);
router.post('/unblock/:targetUserId', unblockUser);
router.get('/blocked',                getBlockedUsers);

export default router;