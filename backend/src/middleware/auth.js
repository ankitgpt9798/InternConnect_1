import User from '../models/User.js';
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '../utils/authCookie.js';
import { now } from '../utils/clock.js';
import { SESSION_MESSAGES, validateSessionToken } from '../utils/sessions.js';

// Lets the request continue only for a logged-in user, who is then available as req.user (and the session as
// req.authSession). The session is checked in the database on every request (Module 6), so a session that was signed
// out, or a phone or tablet session after 1:00 PM IST, is refused at once. Every 401 carries a `code` the app reads.
export async function protect(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ code: 'NOT_LOGGED_IN', message: SESSION_MESSAGES.NOT_LOGGED_IN });
  }

  const at = now();
  const result = await validateSessionToken(token, req, at);
  if (!result.ok) {
    clearSessionCookie(res);
    return res.status(401).json({ code: result.code, message: result.message });
  }

  const user = await User.findById(result.session.user);
  if (!user) {
    clearSessionCookie(res);
    return res.status(401).json({ code: 'SESSION_EXPIRED', message: SESSION_MESSAGES.SESSION_EXPIRED });
  }

  // The token was replaced (every 15 minutes): the browser gets the new one with this answer.
  if (result.newToken) setSessionCookie(res, result.newToken, result.session.expiresAt, at);

  req.user = user;
  req.authSession = result.session;
  next();
}
