import { Router } from 'express';
import { createPost, deletePost, getPost, getPosts } from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { uploadPostMedia } from '../middleware/upload.js';

const router = Router();

// Public Space is only for logged-in students.
router.use(protect);

router.get('/', getPosts);
router.post('/', uploadPostMedia, createPost);
router.get('/:id', getPost);
router.delete('/:id', deletePost);

export default router;
