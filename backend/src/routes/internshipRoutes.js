import { Router } from 'express';
import { applyToInternship, getInternship, getInternships } from '../controllers/internshipController.js';
import { protect } from '../middleware/auth.js';
import { uploadApplicationResume } from '../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/', getInternships);
router.get('/:id', getInternship);
// The login check (above) runs before the resume file is read.
router.post('/:id/apply', uploadApplicationResume, applyToInternship);

export default router;
