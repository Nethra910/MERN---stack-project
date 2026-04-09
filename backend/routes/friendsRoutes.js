import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  blockUser,
  unblockUser,
  getRequests,
  getBlockedUsers
} from '../controllers/friendsController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

// Friend Requests

// Friends
router.get('/', protect, getFriends);
router.delete('/:friendId', protect, removeFriend);

// Friend Requests
router.post('/request', protect, sendFriendRequest);
router.post('/request/accept', protect, acceptFriendRequest);
router.post('/request/reject', protect, rejectFriendRequest);
router.get('/requests', protect, getRequests);

// Blocked Users
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);

export default router;
