import api from './axios.js';

// Public Space API calls. Each one returns the useful part of the response.
export const getPosts = (page = 1) => api.get('/posts', { params: { page } }).then((res) => res.data);

export const getPost = (id) => api.get(`/posts/${id}`).then((res) => res.data.post);

// formData holds "caption" and an optional "media" file; onUploadProgress reports the upload.
export const createPost = (formData, onUploadProgress) =>
  api.post('/posts', formData, { onUploadProgress }).then((res) => res.data.post);

export const deletePost = (id) => api.delete(`/posts/${id}`);
