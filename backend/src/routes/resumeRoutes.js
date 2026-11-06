import { Router } from 'express';
import { getMyResume, saveMyResume } from '../controllers/resumeController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/me', getMyResume);
router.put('/me', saveMyResume);

export default router;
