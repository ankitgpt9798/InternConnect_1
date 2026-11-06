import axios from 'axios';

// Every API call goes through this instance. In development Vite forwards /api to the Express server.
// withCredentials sends the login cookie with each request.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default api;
