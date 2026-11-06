import api from './axios.js';

// Forgot password. identifier = email or 10-digit mobile number.
// Returns { message, channel, destination, expiresInMinutes, resendAfterSeconds }.
export const requestResetCode = (identifier) => api.post('/auth/forgot-password', { identifier }).then((res) => res.data);
