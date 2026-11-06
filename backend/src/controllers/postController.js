import mongoose from 'mongoose';
import Post, { CAPTION_MAX } from '../models/Post.js';
import { deleteMedia, uploadMedia } from '../utils/cloudinary.js';
import { toText } from '../utils/validators.js';

const PAGE_SIZE = 10;

// What the API sends back about a post, as seen by the logged-in user.
function postResponse(post, userId) {
  return {
    id: post._id,
    author: { id: post.author._id, name: post.author.name },
    caption: post.caption,
    media: post.media ? { url: post.media.url, type: post.media.type } : null,
    isMine: post.author._id.equals(userId),
    createdAt: post.createdAt,
  };
}

async function findPost(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Post.findById(id).populate('author', 'name');
}

// GET /api/posts?page=1 - newest posts first
export async function getPosts(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  // One extra post tells us whether there is another page.
  const posts = await Post.find()
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .populate('author', 'name');

  res.json({
    posts: posts.slice(0, PAGE_SIZE).map((post) => postResponse(post, req.user._id)),
    page,
    hasMore: posts.length > PAGE_SIZE,
  });
}

// POST /api/posts - multipart form: caption and/or one "media" file
export async function createPost(req, res) {
  const caption = toText(req.body?.caption);

  if (caption.length > CAPTION_MAX) {
    return res.status(400).json({ message: `The caption can be at most ${CAPTION_MAX} characters.` });
  }
  if (!caption && !req.file) {
    return res.status(400).json({ message: 'Write something or add a photo or video.' });
  }

  let media = null;
  if (req.file) {
    try {
      media = await uploadMedia(req.file);
    } catch (error) {
      console.error('Cloudinary upload failed:', error.message);
      return res.status(502).json({ message: 'The file could not be uploaded. Please try again.' });
    }
  }

  const post = await Post.create({ author: req.user._id, caption, media });
  await post.populate('author', 'name');
  res.status(201).json({ post: postResponse(post, req.user._id) });
}

// GET /api/posts/:id
export async function getPost(req, res) {
  const post = await findPost(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  res.json({ post: postResponse(post, req.user._id) });
}

// DELETE /api/posts/:id - only the author
export async function deletePost(req, res) {
  const post = await findPost(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  if (!post.author._id.equals(req.user._id)) {
    return res.status(403).json({ message: 'You can only delete your own posts.' });
  }

  if (post.media) {
    try {
      await deleteMedia(post.media);
    } catch (error) {
      // The post is still deleted; the file can be removed from Cloudinary later.
      console.error('Cloudinary delete failed:', error.message);
    }
  }
  await post.deleteOne();
  res.json({ message: 'Post deleted.' });
}
