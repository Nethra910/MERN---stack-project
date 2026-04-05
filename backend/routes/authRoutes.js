import express from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// ✅ Public routes with rate limiting
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);

// ✅ Protected route example - Get current user info
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    message: 'User authenticated',
    user: req.user,
  });
});

export default router;