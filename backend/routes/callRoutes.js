import express from 'express';
import protect from '../middleware/authMiddleware.js'; // ✅ FIXED

import {
  getCallHistory,
  getMissedCallCount,
  deleteCallRecord,
} from '../controllers/callController.js';

const router = express.Router();

router.use(protect); // All call routes require authentication

router.get('/history', getCallHistory);
router.get('/missed-count', getMissedCallCount);
router.delete('/:callId', deleteCallRecord);

export default router;