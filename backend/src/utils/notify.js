import Notification from '../models/Notification.js';

// Creates a notification. Nobody is notified of their own actions, and a failure here never undoes the
// action itself (the like, comment or request is already saved), so errors are only logged.
export async function notify({ recipient, actor, type, post = null }) {
  if (recipient.equals(actor)) return;
  try {
    await Notification.create({ recipient, actor, type, post });
  } catch (error) {
    console.error('Notification could not be saved:', error.message);
  }
}

// Removes notifications that no longer make sense (an unlike, a deleted post, a request that ended).
export async function removeNotifications(filter) {
  try {
    await Notification.deleteMany(filter);
  } catch (error) {
    console.error('Notifications could not be removed:', error.message);
  }
}
