import { Router } from 'express';
import { downloadApplicationResume, getMyApplications } from '../controllers/internshipController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', protect, getMyApplications);
router.get('/:id/resume', protect, downloadApplicationResume); // only the student who applied

export default router;
