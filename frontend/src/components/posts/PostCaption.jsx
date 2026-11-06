import { Link } from 'react-router';

// Same characters as the backend (backend/src/utils/hashtags.js).
const HASHTAG_SPLIT = /(#[\p{L}\p{M}\p{N}_]{1,50})/u;
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Highlights "@Name" for each friend the post mentions.
function withMentions(text, mentions, keyPrefix) {
  if (mentions.length === 0) return text;
  // Longer names first, so "@Ravi Kumar" wins over "@Ravi".
  const names = mentions.map((mention) => escapeRegex(mention.name)).sort((a, b) => b.length - a.length);
  const parts = text.split(new RegExp(`(@(?:${names.join('|')}))`, 'u'));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span key={`${keyPrefix}-${index}`} className="font-semibold text-brand-700">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// The caption with #hashtags as links to their page and @mentions highlighted.
export default function PostCaption({ text, hashtags, mentions }) {
  const parts = text.split(HASHTAG_SPLIT);

  return (
    <p className="px-4 pb-3 break-words whitespace-pre-line text-slate-800">
      {parts.map((part, index) => {
        const tag = index % 2 === 1 ? part.slice(1).toLowerCase() : null;
        // Only real hashtags become links: saved with the post, at the start or after a space.
        const startsWord = /(?:^|\s)$/.test(parts[index - 1]);
        if (tag && startsWord && hashtags.includes(tag)) {
          return (
            <Link key={index} to={`/hashtags/${encodeURIComponent(tag)}`} className="font-medium text-brand-700 hover:underline">
              {part}
            </Link>
          );
        }
        return <span key={index}>{withMentions(part, mentions, index)}</span>;
      })}
    </p>
  );
}
