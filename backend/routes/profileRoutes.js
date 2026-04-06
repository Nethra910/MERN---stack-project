import express from 'express';
import {
  uploadProfilePicture,
  deleteProfilePicture,
  updateBio,
  updateName,
  changePassword,
  deleteAccount,
  getProfile
} from '../controllers/profileController.js';
import protect from '../middleware/authMiddleware.js';
import { uploadSingle, handleMulterError } from '../middleware/uploadMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// RATE LIMITERS
// ═══════════════════════════════════════════════════════════════

// Profile updates (name, bio, picture) - 10 per hour
const profileUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many profile update attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password changes - 5 per hour (stricter)
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Account deletion - 1 per hour (very strict)
const accountDeleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1,
  message: {
    success: false,
    message: 'Account deletion limit reached. Please try again later or contact support.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ═══════════════════════════════════════════════════════════════
// ROUTES (All require authentication)
// ═══════════════════════════════════════════════════════════════

// GET /api/profile - Get current user's profile
router.get('/', protect, getProfile);

// POST /api/profile/upload-picture - Upload profile picture
router.post(
  '/upload-picture',
  protect,
  profileUpdateLimiter,
  uploadSingle,
  handleMulterError,
  uploadProfilePicture
);

// DELETE /api/profile/delete-picture - Delete profile picture
router.delete(
  '/delete-picture',
  protect,
  profileUpdateLimiter,
  deleteProfilePicture
);

// PUT /api/profile/bio - Update bio
router.put(
  '/bio',
  protect,
  profileUpdateLimiter,
  updateBio
);

// PUT /api/profile/name - Update name
router.put(
  '/name',
  protect,
  profileUpdateLimiter,
  updateName
);

// PUT /api/profile/change-password - Change password
router.put(
  '/change-password',
  protect,
  passwordChangeLimiter,
  changePassword
);

// DELETE /api/profile/delete-account - Delete account
router.delete(
  '/delete-account',
  protect,
  accountDeleteLimiter,
  deleteAccount
);

export default router;
