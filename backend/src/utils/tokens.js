import { createHash, randomBytes } from 'node:crypto';

// A random 256-bit secret for a cookie (session, device or sign-in challenge), safe to put in a URL or cookie.
export const newToken = () => randomBytes(32).toString('base64url');

// Only this SHA-256 hash is stored in the database, never the token itself. The tokens are long and random, so a
// fast hash is enough (passwords and 6-digit codes are short, so those use bcrypt instead).
export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');
