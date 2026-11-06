import mongoose from 'mongoose';
import Post, { CAPTION_MAX, COMMENT_MAX, HIDE_AFTER_REPORTS, REPORT_REASONS } from '../models/Post.js';
import { deleteMedia, uploadMedia } from '../utils/cloudinary.js';
import { extractHashtags, TAG_PATTERN } from '../utils/hashtags.js';
import { notify, removeNotifications } from '../utils/notify.js';
import { getPostingAllowance } from '../utils/postingLimit.js';
import { toText } from '../utils/validators.js';

const PAGE_SIZE = 10;
const MAX_MENTIONS = 10;
const POPULATE = [
  { path: 'author', select: 'name' },
  { path: 'mentions', select: 'name' },
  { path: 'comments.user', select: 'name' },
];

const includes = (ids, userId) => ids.some((id) => id.equals(userId));

// What the API sends back about a post, as seen by the logged-in user.
// The lists of who liked, saved or reported a post are never sent, only counts and "byMe" flags.
function postResponse(post, userId) {
  return {
    id: post._id,
    author: { id: post.author._id, name: post.author.name },
    caption: post.caption,
    media: post.media ? { url: post.media.url, type: post.media.type } : null,
    hashtags: post.hashtags,
    mentions: post.mentions.map((user) => ({ id: user._id, name: user.name })),
    likeCount: post.likes.length,
    likedByMe: includes(post.likes, userId),
    comments: post.comments.map((comment) => ({
      id: comment._id,
      user: { id: comment.user._id, name: comment.user.name },
      text: comment.text,
      createdAt: comment.createdAt,
    })),
    shareCount: post.shareCount,
    savedByMe: includes(post.savedBy, userId),
    reportedByMe: post.reports.some((report) => report.user.equals(userId)),
    isMine: post.author._id.equals(userId),
    createdAt: post.createdAt,
  };
}

// Posts with too many reports are hidden, except from their author.
// ($not also matches posts saved before reportCount existed.)
const visibleTo = (userId) => ({
  $or: [{ reportCount: { $not: { $gte: HIDE_AFTER_REPORTS } } }, { author: userId }],
});

async function findVisiblePost(id, userId) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Post.findOne({ _id: id, ...visibleTo(userId) }).populate(POPULATE);
}

const notFound = (res) => res.status(404).json({ message: 'Post not found.' });

// Loads the post again after a change and sends it back.
async function sendPost(res, postId, userId) {
  const post = await Post.findById(postId).populate(POPULATE);
  if (!post) return notFound(res); // deleted by its author in the meantime
  res.json({ post: postResponse(post, userId) });
}

// One page of posts matching `filter`, newest first.
async function sendPage(req, res, filter) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

  // One extra post tells us whether there is another page.
  const posts = await Post.find({ ...filter, ...visibleTo(req.user._id) })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE + 1)
    .populate(POPULATE);

  res.json({
    posts: posts.slice(0, PAGE_SIZE).map((post) => postResponse(post, req.user._id)),
    page,
    hasMore: posts.length > PAGE_SIZE,
  });
}

// GET /api/posts?page=1 - all posts
//   &feed=friends     only posts by the user's friends and the user
//   &tag=internship   only posts with that hashtag
export function getPosts(req, res) {
  const filter = {};
  if (req.query.feed === 'friends') filter.author = { $in: [...req.user.friends, req.user._id] };

  const tag = toText(req.query.tag).replace(/^#/, '').toLowerCase();
  if (tag) {
    if (!TAG_PATTERN.test(tag)) return res.status(400).json({ message: 'That is not a valid hashtag.' });
    filter.hashtags = tag;
  }
  return sendPage(req, res, filter);
}

// The "mentions" form field may arrive once or several times. Only accepted friends of the author are kept.
function friendMentions(value, user) {
  const ids = [].concat(value ?? []).filter((id) => typeof id === 'string' && mongoose.isValidObjectId(id));
  return [...new Set(ids)].filter((id) => user.friends.some((friend) => friend.equals(id))).slice(0, MAX_MENTIONS);
}

// GET /api/posts/saved?page=1 - posts the logged-in user saved
export const getSavedPosts = (req, res) => sendPage(req, res, { savedBy: req.user._id });

// GET /api/posts/allowance - how many posts the logged-in user may still publish today
export async function getAllowance(req, res) {
  res.json({ allowance: await getPostingAllowance(req.user) });
}

// POST /api/posts - multipart form: caption and/or one "media" file.
// The daily posting limit is checked before this runs (middleware/postingLimit.js).
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

  const post = await Post.create({
    author: req.user._id,
    caption,
    media,
    hashtags: extractHashtags(caption),
    mentions: friendMentions(req.body?.mentions, req.user),
  });
  await post.populate(POPULATE);
  await Promise.all(
    post.mentions.map((friend) => notify({ recipient: friend._id, actor: req.user._id, type: 'mention', post: post._id })),
  );
  res.status(201).json({ post: postResponse(post, req.user._id), allowance: await getPostingAllowance(req.user) });
}

// GET /api/posts/:id
export async function getPost(req, res) {
  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);
  res.json({ post: postResponse(post, req.user._id) });
}

// DELETE /api/posts/:id - only the author
export async function deletePost(req, res) {
  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);
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
  await removeNotifications({ post: post._id });
  // Deleting a post made today frees one of today's posts again.
  res.json({ message: 'Post deleted.', allowance: await getPostingAllowance(req.user) });
}

// POST /api/posts/:id/like - like, or unlike if already liked
export async function toggleLike(req, res) {
  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);

  const userId = req.user._id;
  const liked = includes(post.likes, userId);
  await Post.updateOne({ _id: post._id }, liked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } });

  // An unlike takes the "liked your post" notification back.
  if (liked) await removeNotifications({ actor: userId, type: 'like', post: post._id });
  else await notify({ recipient: post.author._id, actor: userId, type: 'like', post: post._id });
  await sendPost(res, post._id, userId);
}

// POST /api/posts/:id/comments  { text }
export async function addComment(req, res) {
  const text = toText(req.body?.text);
  if (!text || text.length > COMMENT_MAX) {
    return res.status(400).json({ message: `A comment must be 1 to ${COMMENT_MAX} characters.` });
  }

  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);

  await Post.updateOne({ _id: post._id }, { $push: { comments: { user: req.user._id, text, createdAt: new Date() } } });
  await notify({ recipient: post.author._id, actor: req.user._id, type: 'comment', post: post._id });
  await sendPost(res, post._id, req.user._id);
}

// POST /api/posts/:id/share - counts a share (the browser copies the post's link)
export async function sharePost(req, res) {
  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);

  await Post.updateOne({ _id: post._id }, { $inc: { shareCount: 1 } });
  await sendPost(res, post._id, req.user._id);
}

// POST /api/posts/:id/save - save, or unsave if already saved
export async function toggleSave(req, res) {
  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);

  const userId = req.user._id;
  const update = includes(post.savedBy, userId) ? { $pull: { savedBy: userId } } : { $addToSet: { savedBy: userId } };
  await Post.updateOne({ _id: post._id }, update);
  await sendPost(res, post._id, userId);
}

// POST /api/posts/:id/report  { reason }
export async function reportPost(req, res) {
  const reason = toText(req.body?.reason);
  if (!REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ message: `Choose a reason: ${REPORT_REASONS.join(', ')}.` });
  }

  const post = await findVisiblePost(req.params.id, req.user._id);
  if (!post) return notFound(res);
  if (post.author._id.equals(req.user._id)) {
    return res.status(400).json({ message: 'You cannot report your own post.' });
  }

  // The filter makes sure each student can report a post only once, even if two requests arrive together.
  const result = await Post.updateOne(
    { _id: post._id, 'reports.user': { $ne: req.user._id } },
    { $push: { reports: { user: req.user._id, reason, createdAt: new Date() } }, $inc: { reportCount: 1 } },
  );
  if (result.modifiedCount === 0) {
    return res.status(409).json({ message: 'You have already reported this post.' });
  }

  const updated = await Post.findById(post._id).populate(POPULATE);
  const hidden = updated.reportCount >= HIDE_AFTER_REPORTS;
  res.json({
    message: 'Thank you. The post has been reported.',
    hidden,
    // Once hidden, the reporter can no longer see the post.
    post: hidden ? null : postResponse(updated, req.user._id),
  });
}
