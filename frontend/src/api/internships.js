import api from './axios.js';

// The Internships page: filters are { search, category, workMode, engagement, city, minStipend, maxDuration, sort }.
// Returns { internships, cities } (the cities that have open internships, for the City filter).
export const searchInternships = (filters = {}) =>
  api.get('/internships', { params: filters }).then((res) => ({ internships: res.data.internships, cities: res.data.cities ?? [] }));

export const getInternship = (id) => api.get(`/internships/${id}`).then((res) => res.data.internship);

// Returns { message, appliedAt }.
export const applyToInternship = (id, coverLetter) =>
  api.post(`/internships/${id}/apply`, { coverLetter }).then((res) => res.data);

export const getMyApplications = () => api.get('/applications').then((res) => res.data.applications);
