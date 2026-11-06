import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';

const AuthContext = createContext(null);

// Keeps the logged-in user for the whole app. The login token itself lives in an httpOnly cookie
// that JavaScript cannot read; the browser sends it with every API request.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true until we know whether the browser already has a valid session
  const [loading, setLoading] = useState(true);

  // On first load (and after a page refresh) ask the server who is logged in.
  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function register(details) {
    const res = await api.post('/auth/register', details);
    setUser(res.data.user);
  }

  async function login(identifier, password) {
    const res = await api.post('/auth/login', { identifier, password });
    setUser(res.data.user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, register, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useAuth() {
  return useContext(AuthContext);
}
