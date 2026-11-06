import { Router } from 'express';
import { getMySubscription, getPlans } from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/plans', getPlans);
router.get('/me', getMySubscription);

export default router;
