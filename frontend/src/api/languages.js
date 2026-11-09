import api from './axios.js';

export async function updateUserLanguage(language) {
  const res = await api.put('/users/me/language', { language });
  return res.data;
}

export async function sendFrenchLanguageOtp() {
  const res = await api.post('/users/me/language/french/otp');
  return res.data;
}

export async function verifyFrenchLanguageOtp(otp) {
  const res = await api.post('/users/me/language/french/verify', { otp });
  return res.data;
}

export async function getLanguageHistory() {
  const res = await api.get('/users/me/language/history');
  return res.data;
}
