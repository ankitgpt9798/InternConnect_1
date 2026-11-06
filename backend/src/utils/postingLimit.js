import Post from '../models/Post.js';
import { startOfIstDay, startOfNextIstDay } from './istTime.js';

// More than this many friends means a student can post as often as they like.
export const UNLIMITED_AFTER_FRIENDS = 10;

// Posts allowed per day: 0 friends -> 0 (cannot post), 1 friend -> 1, 2 friends -> 2 ... 10 friends -> 10,
// more than 10 friends -> unlimited (null).
export function dailyPostLimit(friendCount) {
  return friendCount > UNLIMITED_AFTER_FRIENDS ? null : friendCount;
}

// How many posts the student may still publish today. Posts deleted today no longer count.
export async function getPostingAllowance(user, now = new Date()) {
  const friendCount = user.friends.length;
  const dailyLimit = dailyPostLimit(friendCount);
  const postsToday = await Post.countDocuments({ author: user._id, createdAt: { $gte: startOfIstDay(now) } });

  return {
    friendCount,
    dailyLimit, // null = unlimited
    postsToday,
    remaining: dailyLimit === null ? null : Math.max(0, dailyLimit - postsToday),
    resetsAt: startOfNextIstDay(now),
  };
}
