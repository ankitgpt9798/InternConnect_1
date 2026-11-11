import api from './axios.js';

// Module 6 sign-in. Login and registration answer 200/201 when signed in, or 202 when an email code is needed;
// the code step uses an httpOnly cookie the server set with the 202 answer.
export const loginRequest = (identifier, password, client) => api.post('/auth/login', { identifier, password, client });
export const registerRequest = (details, client) => api.post('/auth/register', { ...details, client });
export const verifySignInCode = (otp) => api.post('/auth/login/verify', { otp });
export const resendSignInCode = () => api.post('/auth/login/resend');
export const cancelSignIn = () => api.post('/auth/login/cancel');
