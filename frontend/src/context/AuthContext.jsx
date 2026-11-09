import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cancelSignIn, loginRequest, registerRequest, resendSignInCode, verifySignInCode } from '../api/auth.js';
import api from '../api/axios.js';
import { applyLanguage, startInStoredLanguage } from '../i18n/index.js';
import { collectClientHints } from '../utils/clientHints.js';

const AuthContext = createContext(null);

// Codes with which the server says this browser's session has ended (Module 6): signed out on another device, a
// phone or tablet at 1:00 PM IST, a copied cookie… Any request that gets one signs the app out, and the login page
// explains why (sessionNotice).
const SESSION_ENDED = new Set(['SESSION_EXPIRED', 'SESSION_REVOKED', 'MOBILE_SESSION_ENDED', 'SESSION_CONTEXT_CHANGED']);
const MAX_TIMER_MS = 2 ** 31 - 1; // setTimeout limit (about 24 days)

// Keeps the logged-in user for the whole app. The session token lives in an httpOnly cookie that JavaScript cannot
// read; the browser sends it with every API request.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null); // { id, deviceClass, expiresAt, serverTime }
  // true until we know whether the browser already has a valid session
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState(null);
  const clockOffset = useRef(0); // server time minus this device's time

  const signedIn = useCallback((data) => {
    setUser(data.user);
    setSessionNotice(null);
    if (data.session) {
      clockOffset.current = new Date(data.session.serverTime).getTime() - Date.now();
      setSession(data.session);
    }
    if (data.user?.preferredLanguage) applyLanguage(data.user.preferredLanguage).catch(() => {});
  }, []);

  const endSession = useCallback((code) => {
    setUser(null);
    setSession(null);
    setSessionNotice(code);
  }, []);

  // Every API answer: a session that ended on the server signs this app out.
  useEffect(() => {
    const id = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && SESSION_ENDED.has(error.response.data?.code)) endSession(error.response.data.code);
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, [endSession]);

  // On first load (and after a page refresh) ask the server who is logged in.
  useEffect(() => {
    let ignore = false;
    api
      .get('/auth/me')
      .then((res) => {
        if (ignore) return;
        signedIn(res.data);
        if (!res.data.user?.preferredLanguage) startInStoredLanguage().catch(() => {});
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
  }, [signedIn]);

  // When the session is due to end (phones and tablets: 1:00 PM IST), ask the server: it decides, and a 401 signs the
  // app out with a clear message even if the page is just left open.
  useEffect(() => {
    if (!session?.expiresAt) return undefined;
    const delay = new Date(session.expiresAt).getTime() - (Date.now() + clockOffset.current);
    if (delay > MAX_TIMER_MS) return undefined;
    const timer = setTimeout(() => {
      api
        .get('/auth/me')
        .then((res) => signedIn(res.data))
        .catch(() => {});
    }, Math.max(0, delay) + 500);
    return () => clearTimeout(timer);
  }, [session, signedIn]);

  // Returns { step: 'done' } when signed in, or { step: 'otp', challenge } when an email code is needed.
  async function login(identifier, password) {
    const res = await loginRequest(identifier, password, await collectClientHints());
    if (res.status === 202) return { step: 'otp', challenge: res.data };
    signedIn(res.data);
    return { step: 'done' };
  }

  // A new account always confirms its email with a code first ({ step: 'otp' }). A phone or tablet outside
  // 10:00 AM–1:00 PM IST gets the account but no session ({ step: 'created', opensAt }).
  async function register(details) {
    const res = await registerRequest(details, await collectClientHints());
    if (res.status === 202) return { step: 'otp', challenge: res.data };
    if (res.data.code === 'ACCOUNT_CREATED_NO_SESSION') return { step: 'created', opensAt: res.data.opensAt };
    signedIn(res.data);
    return { step: 'done' };
  }

  async function verifyCode(otp) {
    const res = await verifySignInCode(otp);
    signedIn(res.data);
  }

  async function resendCode() {
    const res = await resendSignInCode();
    return res.data;
  }

  function cancelChallenge() {
    return cancelSignIn().catch(() => {});
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setSession(null);
    }
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  const dismissNotice = () => setSessionNotice(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        register,
        login,
        verifyCode,
        resendCode,
        cancelChallenge,
        logout,
        updateUser,
        endSession,
        sessionNotice,
        dismissNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useAuth() {
  return useContext(AuthContext);
}
