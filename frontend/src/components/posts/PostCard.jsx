import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { deletePost } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import { timeAgo } from '../../utils/timeAgo.js';
import Avatar from '../Avatar.jsx';

export default function PostCard({ post, onDeleted }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setDeleting(true);
    setError('');
    try {
      await deletePost(post.id);
      onDeleted(post.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={post.author.name} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{post.author.name}</p>
            <Link to={`/posts/${post.id}`} className="text-xs text-slate-500 hover:underline">
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
            </Link>
          </div>
        </div>

        {post.isMine &&
          (confirmingDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Delete this post?</span>
              <button type="button" onClick={handleDelete} disabled={deleting} className="font-semibold text-red-600 hover:underline">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting} className="text-slate-600 hover:underline">
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete post"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          ))}
      </header>

      {post.caption && <p className="px-4 pb-3 break-words whitespace-pre-line text-slate-800">{post.caption}</p>}

      {post.media &&
        (post.media.type === 'video' ? (
          <video src={post.media.url} controls preload="metadata" className="max-h-[32rem] w-full bg-black" />
        ) : (
          <img
            src={post.media.url}
            alt={`Photo shared by ${post.author.name}`}
            loading="lazy"
            className="max-h-[32rem] w-full bg-slate-100 object-contain"
          />
        ))}

      {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}
    </article>
  );
}
