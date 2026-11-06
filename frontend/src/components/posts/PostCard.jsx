import { Bookmark, Flag, Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { deletePost, sharePost, toggleLike, toggleSave } from '../../api/posts.js';
import { getErrorMessage } from '../../utils/getErrorMessage.js';
import { timeAgo } from '../../utils/timeAgo.js';
import Avatar from '../Avatar.jsx';
import CommentSection from './CommentSection.jsx';
import ReportForm from './ReportForm.jsx';

function ActionButton({ icon: Icon, label, count, active = false, activeClass = '', filled = false, ...props }) {
  return (
    <button
      type="button"
      aria-label={count === undefined ? label : `${label} (${count})`}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 disabled:opacity-60 ${
        active ? activeClass : 'text-slate-600'
      }`}
      {...props}
    >
      <Icon className={`size-4 ${filled ? 'fill-current' : ''}`} />
      {count !== undefined && <span>{count}</span>}
    </button>
  );
}

// onUpdated(post) replaces the post in the list; onRemoved(id) takes it out (deleted, or hidden by reports).
export default function PostCard({ post, onUpdated, onRemoved }) {
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(''); // the action waiting for the server
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Runs a like / save / share request and shows the updated post.
  async function run(action, request) {
    setBusy(action);
    setError('');
    setNotice('');
    try {
      onUpdated(await request());
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy('');
    }
  }

  async function handleShare() {
    const link = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      setError(`The link could not be copied. Share it manually: ${link}`);
      return;
    }
    if (await run('share', () => sharePost(post.id))) {
      setNotice('Link copied. Paste it anywhere to share this post.');
    }
  }

  async function handleDelete() {
    setBusy('delete');
    setError('');
    try {
      await deletePost(post.id);
      onRemoved(post.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy('');
      setConfirmingDelete(false);
    }
  }

  function handleReported(result) {
    setShowReport(false);
    if (result.hidden) {
      onRemoved(post.id);
      return;
    }
    onUpdated(result.post);
    setNotice(result.message);
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
              <button type="button" onClick={handleDelete} disabled={busy === 'delete'} className="font-semibold text-red-600 hover:underline">
                {busy === 'delete' ? 'Deleting…' : 'Delete'}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy === 'delete'} className="text-slate-600 hover:underline">
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

      <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-2 py-1.5">
        <ActionButton
          icon={Heart}
          label={post.likedByMe ? 'Unlike' : 'Like'}
          count={post.likeCount}
          active={post.likedByMe}
          activeClass="text-red-600"
          filled={post.likedByMe}
          aria-pressed={post.likedByMe}
          disabled={busy === 'like'}
          onClick={() => run('like', () => toggleLike(post.id))}
        />
        <ActionButton
          icon={MessageCircle}
          label={showComments ? 'Hide comments' : 'Show comments'}
          count={post.comments.length}
          active={showComments}
          activeClass="text-brand-700"
          aria-expanded={showComments}
          onClick={() => setShowComments(!showComments)}
        />
        <ActionButton icon={Share2} label="Copy link to share" count={post.shareCount} disabled={busy === 'share'} onClick={handleShare} />
        <div className="ml-auto flex items-center gap-1">
          <ActionButton
            icon={Bookmark}
            label={post.savedByMe ? 'Remove from saved' : 'Save post'}
            active={post.savedByMe}
            activeClass="text-brand-700"
            filled={post.savedByMe}
            aria-pressed={post.savedByMe}
            disabled={busy === 'save'}
            onClick={() => run('save', () => toggleSave(post.id))}
          />
          {!post.isMine &&
            (post.reportedByMe ? (
              <span className="px-2.5 text-xs font-medium text-slate-500">Reported</span>
            ) : (
              <ActionButton icon={Flag} label="Report post" active={showReport} activeClass="text-red-600" onClick={() => setShowReport(!showReport)} />
            ))}
        </div>
      </div>

      {showReport && <ReportForm postId={post.id} onReported={handleReported} onCancel={() => setShowReport(false)} />}
      {showComments && <CommentSection post={post} onUpdated={onUpdated} />}

      {notice && <p className="border-t border-slate-100 px-4 py-2 text-sm text-green-700">{notice}</p>}
      {error && <p className="border-t border-slate-100 px-4 py-2 text-sm break-words text-red-600">{error}</p>}
    </article>
  );
}
