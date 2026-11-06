import api from './axios.js';

// filters: { search, workMode }
export const getInternships = (filters = {}) => api.get('/internships', { params: filters }).then((res) => res.data.internships);

export const getInternship = (id) => api.get(`/internships/${id}`).then((res) => res.data.internship);

// Returns { message, appliedAt }.
export const applyToInternship = (id, coverLetter) =>
  api.post(`/internships/${id}/apply`, { coverLetter }).then((res) => res.data);

export const getMyApplications = () => api.get('/applications').then((res) => res.data.applications);
