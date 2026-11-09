import { Router } from 'express';
import { searchUsers } from '../controllers/friendController.js';
import {
  getLanguageHistory,
  sendFrenchOtp,
  updateLanguage,
  verifyFrenchOtp,
} from '../controllers/languageController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/search', protect, searchUsers);

// Module 5: Six Languages
router.put('/me/language', protect, updateLanguage);
router.post('/me/language/french/otp', protect, sendFrenchOtp);
router.post('/me/language/french/verify', protect, verifyFrenchOtp);
router.get('/me/language/history', protect, getLanguageHistory);

export default router;
