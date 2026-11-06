import { Router } from 'express';
import {
  addComment,
  createPost,
  deletePost,
  getPost,
  getPosts,
  getSavedPosts,
  reportPost,
  sharePost,
  toggleLike,
  toggleSave,
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { uploadPostMedia } from '../middleware/upload.js';

const router = Router();

// Public Space is only for logged-in students.
router.use(protect);

router.get('/', getPosts);
router.post('/', uploadPostMedia, createPost);
router.get('/saved', getSavedPosts); // before "/:id", so "saved" is not read as a post id
router.get('/:id', getPost);
router.delete('/:id', deletePost);

router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.post('/:id/share', sharePost);
router.post('/:id/save', toggleSave);
router.post('/:id/report', reportPost);

export default router;
