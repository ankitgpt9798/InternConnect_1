import mongoose from 'mongoose';

// A pending friend request. It is deleted when it is accepted, declined or cancelled.
const friendRequestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

// A student can have only one pending request to the same student.
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });
friendRequestSchema.index({ to: 1, createdAt: -1 });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

export default FriendRequest;
