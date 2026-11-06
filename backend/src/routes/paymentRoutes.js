import { Router } from 'express';
import { createSubscriptionOrder, getMyPayments, getPaymentWindow, verifyPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getMyPayments);
router.get('/window', getPaymentWindow);
router.post('/subscription/order', createSubscriptionOrder);
router.post('/verify', verifyPayment);

export default router;
