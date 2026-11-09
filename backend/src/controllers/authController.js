import User from '../models/User.js';
import { clearSessionCookie, SESSION_COOKIE } from '../utils/authCookie.js';
import { now } from '../utils/clock.js';
import { recordActivity, requestContext, startChallenge, windowClosedBody } from '../utils/loginFlow.js';
import { assessSignIn } from '../utils/loginPolicy.js';
import { isRestrictedDevice, mobileWindowStatus } from '../utils/mobileLoginWindow.js';
import { revokeSessionByToken, sessionInfo } from '../utils/sessions.js';
import { userResponse } from '../utils/userResponse.js';
import { toText, validateRegister } from '../utils/validators.js';

// Codes next to each message, so the app can show the error in the student's language.
const FIELD_ERROR_CODES = { name: 'NAME_LENGTH', email: 'EMAIL_INVALID', phone: 'PHONE_INVALID', password: 'PASSWORD_LENGTH' };
const errorCodesFor = (errors) => Object.fromEntries(Object.keys(errors).map((field) => [field, FIELD_ERROR_CODES[field]]));

function duplicateErrors(fields) {
  const errors = {};
  const errorCodes = {};
  if (fields.includes('email')) {
    errors.email = 'This email is already registered.';
    errorCodes.email = 'EMAIL_TAKEN';
  }
  if (fields.includes('phone')) {
    errors.phone = 'This phone number is already registered.';
    errorCodes.phone = 'PHONE_TAKEN';
  }
  return { errors, errorCodes };
}

// POST /api/auth/register
// Module 6: a new account always confirms its email with a 6-digit code before it gets a session (202). A phone or
// tablet outside 10:00 AM–1:00 PM IST creates the account but does not sign in (201 ACCOUNT_CREATED_NO_SESSION).
export async function register(req, res) {
  const body = req.body ?? {};
  const data = {
    name: toText(body.name),
    email: toText(body.email).toLowerCase(),
    phone: toText(body.phone),
    password: typeof body.password === 'string' ? body.password : '',
  };

  const errors = validateRegister(data);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ code: 'VALIDATION', message: 'Please correct the highlighted fields.', errors, errorCodes: errorCodesFor(errors) });
  }

  // Emails are stored in lowercase, so this check is case-insensitive.
  const existing = await User.find({ $or: [{ email: data.email }, { phone: data.phone }] });
  const taken = [];
  if (existing.some((user) => user.email === data.email)) taken.push('email');
  if (existing.some((user) => user.phone === data.phone)) taken.push('phone');
  if (taken.length > 0) {
    return res.status(409).json({ code: 'ACCOUNT_EXISTS', message: 'An account with these details already exists.', ...duplicateErrors(taken) });
  }

  let user;
  try {
    user = await User.create(data); // the password is hashed by the model before saving
  } catch (error) {
    // Two sign-ups with the same details at the same moment: the unique index stops the second one.
    if (error.code === 11000) {
      const fields = Object.keys(error.keyPattern ?? {});
      return res.status(409).json({ code: 'ACCOUNT_EXISTS', message: 'An account with these details already exists.', ...duplicateErrors(fields) });
    }
    throw error;
  }

  const ctx = requestContext(req);
  const flags = { newDevice: true, newBrowser: true, newIp: true };
  const window = mobileWindowStatus(ctx.at);
  if (isRestrictedDevice(ctx.client.deviceClass) && !window.open) {
    await recordActivity({ user, event: 'register', status: 'blocked', reason: 'outside_mobile_window', ctx, flags });
    return res.status(201).json({
      ...windowClosedBody(window),
      code: 'ACCOUNT_CREATED_NO_SESSION',
      message: 'Your account has been created. Phones and tablets can sign in only between 10:00 AM and 1:00 PM IST.',
      user: userResponse(user),
    });
  }

  const decision = assessSignIn({
    purpose: 'register',
    isChrome: ctx.client.isChrome,
    deviceState: 'new',
    ipSeen: false,
    locationKnown: false,
    countrySeen: false,
    browserSeen: false,
    recentFailures: false,
  });
  return startChallenge({ req, res, user, purpose: 'register', decision, flags, ctx });
}

// POST /api/auth/logout — ends this browser's session on the server, not only the cookie.
export async function logout(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await revokeSessionByToken(token, 'logout');
  clearSessionCookie(res);
  res.json({ message: 'Logged out.' });
}

// GET /api/auth/me (protected)
export function getMe(req, res) {
  res.json({ user: userResponse(req.user), session: sessionInfo(req.authSession, now()) });
}
