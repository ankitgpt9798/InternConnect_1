import mongoose from 'mongoose';

export const CAPTION_MAX = 1000;

// The photo or video attached to a post, stored on Cloudinary.
const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // needed to delete the file from Cloudinary
    type: { type: String, enum: ['image', 'video'], required: true },
  },
  { _id: false },
);

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, trim: true, maxlength: CAPTION_MAX, default: '' },
    media: { type: mediaSchema, default: null },
  },
  { timestamps: true },
);

// The feed is read newest first.
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
