import api from './axios.js';

// { notifications: [{ id, type, actor, postId, read, createdAt }], unreadCount }
export const getNotifications = () => api.get('/notifications').then((res) => res.data);

export const getUnreadCount = () => api.get('/notifications/unread-count').then((res) => res.data.unreadCount);

export const markAllRead = () => api.post('/notifications/read-all');
