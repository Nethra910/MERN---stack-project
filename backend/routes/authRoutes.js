import express from 'express';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js'; // ✅ Import protect middleware

const router = express.Router();

// ✅ Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ✅ Protected route example - Get current user info
router.get('/me', protect, (req, res) => {
  res.json({
    success: true,
    message: 'User authenticated',
    user: req.user,
  });
});

export default router;