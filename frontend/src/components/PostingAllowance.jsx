import { Link } from 'react-router';

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// Explains how many posts the student may still publish today (rule: posts per day = number of friends,
// more than 10 friends = unlimited, no friends = no posts).
export default function PostingAllowance({ allowance, showFriendsLink = true }) {
  if (!allowance) return null;
  const { friendCount, dailyLimit, remaining } = allowance;

  let text;
  let blocked = false;
  if (dailyLimit === 0) {
    text = 'Add a friend to start posting. Each friend lets you post one more time a day.';
    blocked = true;
  } else if (dailyLimit === null) {
    text = `You have ${plural(friendCount, 'friend')}, so you can post as often as you like.`;
  } else if (remaining === 0) {
    text = `You have used all ${plural(dailyLimit, 'post')} for today. You can post again after midnight (IST), or add more friends to post more often.`;
    blocked = true;
  } else {
    text = `You can post ${plural(remaining, 'more time')} today (${plural(friendCount, 'friend')} = ${plural(dailyLimit, 'post')} a day).`;
  }

  return (
    <p className={`text-sm ${blocked ? 'text-amber-700' : 'text-slate-600'}`}>
      {text}
      {blocked && showFriendsLink && (
        <>
          {' '}
          <Link to="/friends" className="font-semibold text-brand-700 hover:underline">
            Find friends
          </Link>
        </>
      )}
    </p>
  );
}
