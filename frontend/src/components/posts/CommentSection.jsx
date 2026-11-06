import { Send } from 'lucide-react';
import { useState } from 'react';
import { addComment } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import { timeAgo } from '../../utils/timeAgo.js';
import Avatar from '../Avatar.jsx';
import Button from '../ui/Button.jsx';

const COMMENT_MAX = 500;

export default function CommentSection({ post, onUpdated }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    setError('');
    try {
      onUpdated(await addComment(post.id, text));
      setText('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 px-4 py-3">
      {post.comments.length === 0 ? (
        <p className="text-sm text-slate-500">No comments yet. Start the conversation!</p>
      ) : (
        <ul className="space-y-3">
          {post.comments.map((comment) => (
            <li key={comment.id} className="flex gap-2">
              <Avatar name={comment.user.name} size="sm" />
              <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm">
                  <span className="font-semibold text-slate-900">{comment.user.name}</span>{' '}
                  <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
                </p>
                <p className="text-sm break-words whitespace-pre-line text-slate-800">{comment.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor={`comment-${post.id}`} className="sr-only">
          Write a comment
        </label>
        <input
          id={`comment-${post.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={COMMENT_MAX}
          placeholder="Write a comment…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
        />
        <Button type="submit" size="sm" disabled={sending || !text.trim()} aria-label="Post comment">
          <Send className="size-4" />
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
