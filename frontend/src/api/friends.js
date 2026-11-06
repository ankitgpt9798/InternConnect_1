import api from './axios.js';

// Friends API calls.
export const searchStudents = (q = '') => api.get('/users/search', { params: { q } }).then((res) => res.data.results);

// { friends, received, sent }
export const getFriends = () => api.get('/friends').then((res) => res.data);

export const sendRequest = (userId) => api.post('/friends/requests', { userId }).then((res) => res.data);
export const acceptRequest = (requestId) => api.post(`/friends/requests/${requestId}/accept`).then((res) => res.data);
// Declines a received request, or cancels a sent one.
export const deleteRequest = (requestId) => api.delete(`/friends/requests/${requestId}`).then((res) => res.data);
export const removeFriend = (userId) => api.delete(`/friends/${userId}`).then((res) => res.data);
