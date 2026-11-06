import { Router } from 'express';
import {
  downloadGeneratedResume,
  getGeneratedResumes,
  getMyResume,
  saveMyResume,
  sendResumeOtp,
  verifyResumeOtp,
} from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/me', getMyResume);
router.put('/me', saveMyResume);

// Premium PDF: 1. email code -> 2. code checked, ₹50 order created -> 3. Razorpay (POST /api/payments/verify)
router.post('/me/otp', sendResumeOtp);
router.post('/me/otp/verify', verifyResumeOtp);

router.get('/generated', getGeneratedResumes);
router.get('/generated/:id/pdf', downloadGeneratedResume);

export default router;
