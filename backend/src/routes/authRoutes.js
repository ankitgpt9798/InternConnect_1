import { Router } from 'express';
import { getMe, logout, register } from '../controllers/authController.js';
import { cancelLogin, login, resendLoginCode, verifyLogin } from '../controllers/loginController.js';
import { forgotPassword, resetPassword } from '../controllers/passwordController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Module 6: the email-code step of a login or registration (uses the sign-in challenge cookie)
router.post('/login/verify', verifyLogin);
router.post('/login/resend', resendLoginCode);
router.post('/login/cancel', cancelLogin);

// Forgot password (no login needed)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
