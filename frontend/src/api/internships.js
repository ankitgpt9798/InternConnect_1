import api from './axios.js';

// The Internships page: filters are { search, category, workMode, engagement, city, minStipend, maxDuration, sort }.
// Returns { internships, cities } (the cities that have open internships, for the City filter).
export const searchInternships = (filters = {}) =>
  api.get('/internships', { params: filters }).then((res) => ({ internships: res.data.internships, cities: res.data.cities ?? [] }));

export const getInternship = (id) => api.get(`/internships/${id}`).then((res) => res.data.internship);

// Applies with a cover letter and a resume: an uploaded PDF (resumeFile, sent as a form) or the student's InternConnect
// resume (generatedResumeId). Returns { message, appliedAt, applicationId, resume, quota }.
export function applyToInternship(id, { coverLetter, resumeFile = null, generatedResumeId = null }) {
  if (resumeFile) {
    const form = new FormData();
    form.append('coverLetter', coverLetter);
    form.append('resume', resumeFile);
    return api.post(`/internships/${id}/apply`, form).then((res) => res.data);
  }
  return api.post(`/internships/${id}/apply`, { coverLetter, generatedResumeId }).then((res) => res.data);
}

export const getMyApplications = () => api.get('/applications').then((res) => res.data.applications);

// Download link for the resume sent with one of the student's applications (the login cookie is sent with it).
export const applicationResumeUrl = (applicationId) => `/api/applications/${applicationId}/resume`;
