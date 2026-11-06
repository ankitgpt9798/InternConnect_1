import api from './axios.js';

// { resume, readiness: { ready, missing } }
export const getMyResume = () => api.get('/resumes/me').then((res) => res.data);

// Saves the draft. Returns { message, resume, readiness }.
export const saveMyResume = (resume) => api.put('/resumes/me', resume).then((res) => res.data);
