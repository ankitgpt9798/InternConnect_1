import { Router } from 'express';
import {
  addComment,
  createPost,
  deletePost,
  getAllowance,
  getPost,
  getPosts,
  getSavedPosts,
  reportPost,
  sharePost,
  toggleLike,
  toggleSave,
} from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';
import { checkPostingLimit } from '../middleware/postingLimit.js';
import { uploadPostMedia } from '../middleware/upload.js';

const router = Router();

// Public Space is only for logged-in students.
router.use(protect);

router.get('/', getPosts);
// The limit is checked first, so a refused post never uploads its file.
router.post('/', checkPostingLimit, uploadPostMedia, createPost);
// These come before "/:id", so "saved" and "allowance" are not read as post ids.
router.get('/saved', getSavedPosts);
router.get('/allowance', getAllowance);
router.get('/:id', getPost);
router.delete('/:id', deletePost);

router.post('/:id/like', toggleLike);
router.post('/:id/comments', addComment);
router.post('/:id/share', sharePost);
router.post('/:id/save', toggleSave);
router.post('/:id/report', reportPost);

export default router;
