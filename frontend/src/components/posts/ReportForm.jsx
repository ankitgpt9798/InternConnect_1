import { useState } from 'react';
import { reportPost } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import Button from '../ui/Button.jsx';

// The same reasons as the backend (REPORT_REASONS in backend/src/models/Post.js).
const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'other', label: 'Something else' },
];

export default function ReportForm({ postId, onReported, onCancel }) {
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason) {
      setError('Choose a reason.');
      return;
    }

    setSending(true);
    setError('');
    try {
      onReported(await reportPost(postId, reason));
    } catch (err) {
      setError(getErrorMessage(err));
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Why are you reporting this post?</legend>
        <div className="mt-2 space-y-1">
          {REASONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={`reason-${postId}`}
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={sending}>
          Report
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
