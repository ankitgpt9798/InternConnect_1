import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getNotifications, markAllRead } from '../api/notifications.js';
import Avatar from '../components/Avatar.jsx';
import Alert from '../components/ui/Alert.jsx';
import { getErrorMessage } from '../utils/getErrorMessage.js';
import { timeAgo } from '../utils/timeAgo.js';

const TEXT = {
  like: 'liked your post.',
  comment: 'commented on your post.',
  mention: 'mentioned you in a post.',
  friend_request: 'sent you a friend request.',
  friend_accept: 'accepted your friend request.',
};

// Post notifications open the post; friend notifications open the Friends page.
const linkFor = (notification) => (notification.postId ? `/posts/${notification.postId}` : '/friends');

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications); // unread ones stay highlighted on this visit
        if (data.unreadCount > 0) markAllRead().catch(() => {});
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="mt-1 text-slate-600">Likes, comments, mentions and friend requests.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      {!notifications ? (
        !error && <p className="py-8 text-center text-slate-500">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-slate-500">
          No notifications yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <Link
                to={linkFor(notification)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${notification.read ? '' : 'bg-brand-50/60'}`}
              >
                <Avatar name={notification.actor.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">
                    <span className="font-semibold text-slate-900">{notification.actor.name}</span> {TEXT[notification.type]}
                  </p>
                  <p className="text-xs text-slate-500">{timeAgo(notification.createdAt)}</p>
                </div>
                {!notification.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-600" aria-label="New" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
