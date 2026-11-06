import jwt from 'jsonwebtoken';

export const AUTH_COOKIE = 'token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// The same options are used to set and to clear the cookie; if they differ, the browser keeps the old one.
const cookieOptions = {
  httpOnly: true, // page JavaScript cannot read it (protects the token from XSS)
  sameSite: 'lax', // sent by our own pages (localhost:5173 and :5000 are the same site), not by other sites' forms
  secure: process.env.NODE_ENV === 'production', // HTTPS-only in production; plain http is fine on localhost
  path: '/',
};

// Creates a login token valid for 7 days and stores it in the cookie.
export function setAuthCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}
