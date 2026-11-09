import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.js';
import { applyLanguage, startInStoredLanguage } from '../i18n/index.js';

const AuthContext = createContext(null);

// Keeps the logged-in user for the whole app. The login token itself lives in an httpOnly cookie
// that JavaScript cannot read; the browser sends it with every API request.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true until we know whether the browser already has a valid session
  const [loading, setLoading] = useState(true);

  // On first load (and after a page refresh) ask the server who is logged in.
  useEffect(() => {
    let ignore = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (!ignore) {
          const loadedUser = res.data.user;
          setUser(loadedUser);
          if (loadedUser?.preferredLanguage) {
            applyLanguage(loadedUser.preferredLanguage).catch(() => {});
          } else {
            startInStoredLanguage().catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setUser(null);
          startInStoredLanguage().catch(() => {});
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function register(details) {
    const res = await api.post('/auth/register', details);
    const registeredUser = res.data.user;
    setUser(registeredUser);
    if (registeredUser?.preferredLanguage) {
      applyLanguage(registeredUser.preferredLanguage).catch(() => {});
    }
  }

  async function login(identifier, password) {
    const res = await api.post('/auth/login', { identifier, password });
    const loggedInUser = res.data.user;
    setUser(loggedInUser);
    if (loggedInUser?.preferredLanguage) {
      applyLanguage(loggedInUser.preferredLanguage).catch(() => {});
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useAuth() {
  return useContext(AuthContext);
}
