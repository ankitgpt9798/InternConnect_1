import { Router } from 'express';
import { acceptRequest, deleteRequest, getFriends, removeFriend, sendRequest } from '../controllers/friendController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use(protect);

router.get('/', getFriends);
router.post('/requests', sendRequest);
router.post('/requests/:id/accept', acceptRequest);
router.delete('/requests/:id', deleteRequest);
router.delete('/:userId', removeFriend);

export default router;
