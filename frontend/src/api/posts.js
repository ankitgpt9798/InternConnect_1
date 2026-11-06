import api from './axios.js';

// Public Space API calls. Each one returns the useful part of the response.
// filters: { feed: 'friends' } or { tag: 'internship' }
export const getPosts = (page = 1, filters = {}) => api.get('/posts', { params: { page, ...filters } }).then((res) => res.data);

export const getSavedPosts = (page = 1) => api.get('/posts/saved', { params: { page } }).then((res) => res.data);

export const getPost = (id) => api.get(`/posts/${id}`).then((res) => res.data.post);

// { friendCount, dailyLimit (null = unlimited), postsToday, remaining, resetsAt }
export const getAllowance = () => api.get('/posts/allowance').then((res) => res.data.allowance);

// formData holds "caption" and an optional "media" file; onUploadProgress reports the upload.
// Returns { post, allowance }.
export const createPost = (formData, onUploadProgress) =>
  api.post('/posts', formData, { onUploadProgress }).then((res) => res.data);

export const deletePost = (id) => api.delete(`/posts/${id}`);

// These return the updated post.
export const toggleLike = (id) => api.post(`/posts/${id}/like`).then((res) => res.data.post);
export const addComment = (id, text) => api.post(`/posts/${id}/comments`, { text }).then((res) => res.data.post);
export const sharePost = (id) => api.post(`/posts/${id}/share`).then((res) => res.data.post);
export const toggleSave = (id) => api.post(`/posts/${id}/save`).then((res) => res.data.post);

// Returns { message, hidden, post }; post is null when the report hid it.
export const reportPost = (id, reason) => api.post(`/posts/${id}/report`, { reason }).then((res) => res.data);
