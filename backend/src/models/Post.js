import mongoose from 'mongoose';

export const CAPTION_MAX = 1000;
export const COMMENT_MAX = 500;
export const REPORT_REASONS = ['spam', 'inappropriate', 'harassment', 'other'];
// A post reported by this many different students is hidden from everyone except its author.
export const HIDE_AFTER_REPORTS = 3;

const { ObjectId } = mongoose.Schema.Types;

// The photo or video attached to a post, stored on Cloudinary.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // needed to delete the file from Cloudinary
    type: { type: String, enum: ['image', 'video'], required: true },
  },
  { _id: false },
);

const commentSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: COMMENT_MAX },
  createdAt: { type: Date, default: Date.now },
});

const reportSchema = new mongoose.Schema(
  {
    user: { type: ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    author: { type: ObjectId, ref: 'User', required: true },
    caption: { type: String, trim: true, maxlength: CAPTION_MAX, default: '' },
    media: { type: mediaSchema, default: null },
    likes: [{ type: ObjectId, ref: 'User' }], // students who liked the post
    comments: [commentSchema],
    shareCount: { type: Number, default: 0 },
    savedBy: [{ type: ObjectId, ref: 'User' }], // students who saved the post
    reports: [reportSchema],
    reportCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// The feed and the saved list are read newest first.
postSchema.index({ createdAt: -1 });
postSchema.index({ savedBy: 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
