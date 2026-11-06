import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = ['like', 'comment', 'mention', 'friend_request', 'friend_accept'];

const { ObjectId } = mongoose.Schema.Types;

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: ObjectId, ref: 'User', required: true }, // who sees the notification
    actor: { type: ObjectId, ref: 'User', required: true }, // who did something
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    post: { type: ObjectId, ref: 'Post', default: null }, // for like, comment and mention
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
