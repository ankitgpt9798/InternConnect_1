import { Router } from 'express';
import { applyToInternship, getInternship, getInternships } from '../controllers/internshipController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getInternships);
router.get('/:id', getInternship);
router.post('/:id/apply', applyToInternship);

export default router;
