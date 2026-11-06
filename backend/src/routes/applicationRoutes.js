import { Router } from 'express';
import { getMyApplications } from '../controllers/internshipController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getMyApplications);

export default router;
