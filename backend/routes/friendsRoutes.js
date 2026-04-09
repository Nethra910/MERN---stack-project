import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getFriends,
  removeFriend,
  blockUser,
  unblockUser,
  getRequests,
  getBlockedUsers,
} from '../controllers/friendsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// ─── IMPORTANT: Specific routes MUST come before parameterized routes ───────
// If /:friendId is defined first, Express will match "requests" and "blocked"
// as friendId values — silently breaking those endpoints.

// Friend request actions
router.post('/request', protect, sendFriendRequest);
router.post('/request/accept', protect, acceptFriendRequest);
router.post('/request/reject', protect, rejectFriendRequest);
router.post('/request/cancel', protect, cancelFriendRequest);

// Friend request listing
router.get('/requests', protect, getRequests);

// Blocked users
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);

// Friends list & removal — parameterized route goes LAST
router.get('/', protect, getFriends);
router.delete('/:friendId', protect, removeFriend);

export default router;