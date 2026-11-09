import api from './axios.js';

// Module 6: the student's own login history, sessions and devices.
export async function getLoginHistory(before) {
  const res = await api.get('/users/me/login-history', { params: { limit: 10, ...(before && { before }) } });
  return res.data;
}

export async function getSessions() {
  const res = await api.get('/users/me/sessions');
  return res.data;
}

export async function revokeSession(id, password) {
  const res = await api.post(`/users/me/sessions/${id}/revoke`, { password });
  return res.data;
}

export async function revokeOtherSessions(password) {
  const res = await api.post('/users/me/sessions/revoke-others', { password });
  return res.data;
}

export async function getDevices() {
  const res = await api.get('/users/me/devices');
  return res.data;
}

export async function removeDevice(id, password) {
  const res = await api.post(`/users/me/devices/${id}/remove`, { password });
  return res.data;
}
