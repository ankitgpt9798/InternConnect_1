import { Router } from 'express';
import { searchUsers } from '../controllers/friendController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/search', protect, searchUsers);

export default router;
