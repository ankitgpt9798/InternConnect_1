import api from './axios.js';

// { resume, readiness: { ready, missing } }
export const getMyResume = () => api.get('/resumes/me').then((res) => res.data);

// Saves the draft. Returns { message, resume, readiness }.
export const saveMyResume = (resume) => api.put('/resumes/me', resume).then((res) => res.data);

// Premium PDF, step 1: emails a code. Returns { message, destination, expiresInMinutes, resendAfterSeconds }.
export const requestResumeCode = () => api.post('/resumes/me/otp').then((res) => res.data);

// Step 2: checks the code; returns { checkout } for the ₹50 Razorpay payment.
export const verifyResumeCode = (otp) => api.post('/resumes/me/otp/verify', { otp }).then((res) => res.data);

// [{ id, fullName, createdAt, onProfile }], newest first
export const getGeneratedResumes = () => api.get('/resumes/generated').then((res) => res.data.resumes);

// A normal link to this address downloads the PDF (the login cookie is sent with it).
export const resumePdfUrl = (id) => `/api/resumes/generated/${id}/pdf`;
