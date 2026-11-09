import { Router } from 'express';
import { searchUsers } from '../controllers/friendController.js';
import {
  getLanguageHistory,
  sendFrenchOtp,
  updateLanguage,
  verifyFrenchOtp,
} from '../controllers/languageController.js';
import {
  getDevices,
  getLoginHistory,
  getSessions,
  removeDevice,
  revokeOtherSessions,
  revokeSessionById,
} from '../controllers/securityController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/search', protect, searchUsers);

// Module 5: Six Languages
router.put('/me/language', protect, updateLanguage);
router.post('/me/language/french/otp', protect, sendFrenchOtp);
router.post('/me/language/french/verify', protect, verifyFrenchOtp);
router.get('/me/language/history', protect, getLanguageHistory);

// Module 6: login history, active sessions and devices (only the student's own)
router.get('/me/login-history', protect, getLoginHistory);
router.get('/me/sessions', protect, getSessions);
router.post('/me/sessions/revoke-others', protect, revokeOtherSessions);
router.post('/me/sessions/:id/revoke', protect, revokeSessionById);
router.get('/me/devices', protect, getDevices);
router.post('/me/devices/:id/remove', protect, removeDevice);

export default router;
