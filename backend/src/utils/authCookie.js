import { createHash } from 'node:crypto';

// Module 6 cookies. All are httpOnly (page JavaScript cannot read them) and Secure (HTTPS only) in production.
//   token        the session token. Path "/", so the resume PDF download links keep working. SameSite=Lax.
//   ic_signin    the sign-in challenge between the password step and the email code. Only for /api/auth.
//   icd_<key>    the device token of one account in this browser (one cookie per account). Only for /api/auth.
export const SESSION_COOKIE = 'token';
export const CHALLENGE_COOKIE = 'ic_signin';
const DEVICE_COOKIE_PREFIX = 'icd_';
const DEVICE_COOKIE_DAYS = 90;

const secure = () => process.env.NODE_ENV === 'production';
// The same options are used to set and to clear a cookie; if they differ, the browser keeps the old one.
const sessionOptions = () => ({ httpOnly: true, sameSite: 'lax', secure: secure(), path: '/' });
const authOnlyOptions = () => ({ httpOnly: true, sameSite: 'strict', secure: secure(), path: '/api/auth' });
const maxAgeUntil = (expiresAt, at) => Math.max(0, expiresAt.getTime() - at.getTime());

export function setSessionCookie(res, token, expiresAt, at) {
  res.cookie(SESSION_COOKIE, token, { ...sessionOptions(), maxAge: maxAgeUntil(expiresAt, at) });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, sessionOptions());
}

export function setChallengeCookie(res, token, expiresAt, at) {
  res.cookie(CHALLENGE_COOKIE, token, { ...authOnlyOptions(), maxAge: maxAgeUntil(expiresAt, at) });
}

export function clearChallengeCookie(res) {
  res.clearCookie(CHALLENGE_COOKIE, authOnlyOptions());
}

// The cookie name comes from a hash of the account id, so it does not show which account it belongs to.
export const deviceCookieName = (userId) => `${DEVICE_COOKIE_PREFIX}${createHash('sha256').update(String(userId)).digest('hex').slice(0, 16)}`;

export function setDeviceCookie(res, userId, token) {
  res.cookie(deviceCookieName(userId), token, { ...authOnlyOptions(), maxAge: DEVICE_COOKIE_DAYS * 24 * 60 * 60 * 1000 });
}

export function clearDeviceCookie(res, userId) {
  res.clearCookie(deviceCookieName(userId), authOnlyOptions());
}

export const readDeviceCookie = (req, userId) => req.cookies?.[deviceCookieName(userId)] ?? null;
