import Notification from '../models/Notification.js';

const LIMIT = 30;

// GET /api/notifications - the latest 30, newest first, and how many are unread
export async function getNotifications(req, res) {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(LIMIT).populate('actor', 'name'),
    Notification.countDocuments({ recipient: req.user._id, read: false }),
  ]);

  res.json({
    notifications: notifications.map((notification) => ({
      id: notification._id,
      type: notification.type,
      actor: { id: notification.actor._id, name: notification.actor.name },
      postId: notification.post,
      read: notification.read,
      createdAt: notification.createdAt,
    })),
    unreadCount,
  });
}

// GET /api/notifications/unread-count - for the bell in the navbar
export async function getUnreadCount(req, res) {
  res.json({ unreadCount: await Notification.countDocuments({ recipient: req.user._id, read: false }) });
}

// POST /api/notifications/read-all
export async function markAllRead(req, res) {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { $set: { read: true } });
  res.json({ unreadCount: 0 });
}
