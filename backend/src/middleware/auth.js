import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AUTH_COOKIE } from '../utils/authCookie.js';

// Lets the request continue only for a logged-in user, who is then available as req.user.
export async function protect(req, res, next) {
  const token = req.cookies[AUTH_COOKIE];
  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // Expired, changed or signed with another secret.
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }

  const user = await User.findById(payload.id);
  if (!user) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }

  req.user = user;
  next();
}
