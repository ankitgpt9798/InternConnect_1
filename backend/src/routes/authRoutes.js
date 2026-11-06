import { Router } from 'express';
import { getMe, login, logout, register } from '../controllers/authController.js';
import { forgotPassword } from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Forgot password (no login needed)
router.post('/forgot-password', forgotPassword);

export default router;
