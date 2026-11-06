import { getPostingAllowance } from '../utils/postingLimit.js';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Runs before the upload, so a post that is not allowed never sends a file to Cloudinary.
export async function checkPostingLimit(req, res, next) {
  const allowance = await getPostingAllowance(req.user);

  if (allowance.dailyLimit === 0) {
    return res.status(403).json({
      message: 'Add at least one friend to start posting in Public Space.',
      allowance,
    });
  }
  if (allowance.remaining === 0) {
    return res.status(429).json({
      message:
        `You have reached today's limit of ${plural(allowance.dailyLimit, 'post')} ` +
        `(${plural(allowance.friendCount, 'friend')}). You can post again after midnight (IST), or add more friends to post more often.`,
      allowance,
    });
  }
  next();
}
