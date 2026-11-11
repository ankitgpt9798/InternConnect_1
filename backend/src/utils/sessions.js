import Device from '../models/Device.js';
import LoginActivity from '../models/LoginActivity.js';
import LoginChallenge from '../models/LoginChallenge.js';
import { DAY_MS } from '../models/securityFields.js';
import Session from '../models/Session.js';
import { bindingFromUserAgent, sameBinding } from './clientInfo.js';
import { now } from './clock.js';
import { normalizeIp } from './ip.js';
import { isRestrictedDevice, mobileSessionExpiry } from './mobileLoginWindow.js';
import { hashToken, newToken } from './tokens.js';

// Module 6 server-side sessions: one random token per signed-in browser, only its hash stored, replaced every
// 15 minutes. There is no separate refresh token: this record is checked on every request, so when it ends
// (logout, sign-out from another device, password reset, 1:00 PM IST for phones and tablets) access ends at once.
const MINUTE = 60_000;
export const SESSION_DAYS = 7;
export const ROTATE_AFTER_MS = 15 * MINUTE;
export const ROTATION_GRACE_MS = MINUTE; // the previous token still works this long (requests already on their way)
const RECOVERY_WINDOW_MS = 10 * MINUTE;
const ACTIVITY_WRITE_MS = 5 * MINUTE;
const PURGE_AFTER_END_MS = 30 * DAY_MS;

export const SESSION_MESSAGES = {
  NOT_LOGGED_IN: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  SESSION_REVOKED: 'You were signed out of this device. Please log in again.',
  MOBILE_SESSION_ENDED: 'Phone and tablet access ends at 1:00 PM IST. You can log in again from 10:00 AM IST.',
  SESSION_CONTEXT_CHANGED: 'Your browser or device changed, so you were signed out to keep your account safe. Please log in again.',
};
const fail = (code) => ({ ok: false, code, message: SESSION_MESSAGES[code] });

export const sessionExpiryFor = (deviceClass, createdAt) =>
  isRestrictedDevice(deviceClass) ? mobileSessionExpiry(createdAt) : new Date(createdAt.getTime() + SESSION_DAYS * DAY_MS);

// What the frontend needs to know about the current session (e.g. to show the 1 PM sign-out on time).
export const sessionInfo = (session, at) => ({ id: session._id, deviceClass: session.deviceClass, expiresAt: session.expiresAt, serverTime: at });

export async function createSession({ userId, deviceId, loginActivityId, client, location, via, at, dbSession }) {
  const token = newToken();
  const expiresAt = sessionExpiryFor(client.deviceClass, at);
  const [session] = await Session.create(
    [
      {
        user: userId,
        device: deviceId,
        loginActivity: loginActivityId,
        tokenHash: hashToken(token),
        rotatedAt: at,
        rotatedIp: client.ip,
        binding: client.binding,
        deviceClass: client.deviceClass,
        browser: client.browser,
        os: client.os,
        model: client.model,
        ip: client.ip,
        lastIp: client.ip,
        location,
        lastActiveAt: at,
        expiresAt,
        createdVia: via,
        purgeAt: new Date(expiresAt.getTime() + PURGE_AFTER_END_MS),
      },
    ],
    { session: dbSession },
  );
  return { session, token };
}

function endedCode(session, at) {
  if (session.revokedAt) {
    if (session.revokedReason === 'mobile_window_ended') return 'MOBILE_SESSION_ENDED';
    if (session.revokedReason === 'expired') return 'SESSION_EXPIRED';
    if (session.revokedReason === 'context_changed') return 'SESSION_CONTEXT_CHANGED';
    return 'SESSION_REVOKED';
  }
  if (at >= session.expiresAt) return isRestrictedDevice(session.deviceClass) ? 'MOBILE_SESSION_ENDED' : 'SESSION_EXPIRED';
  return null;
}

// Gives the session a new token. Exactly one of several parallel requests succeeds (the update matches the token it
// read); the others carry on with their token, which stays valid during the grace period.
async function rotateToken(session, { fromPrevious, presentedHash, at, ip }) {
  const token = newToken();
  const filter = fromPrevious
    ? { _id: session._id, previousTokenHash: presentedHash, tokenUsedAt: null, rotatedAt: session.rotatedAt, revokedAt: null }
    : { _id: session._id, tokenHash: presentedHash, revokedAt: null };
  const set = { tokenHash: hashToken(token), rotatedAt: at, rotatedIp: ip, tokenUsedAt: null };
  if (!fromPrevious) set.previousTokenHash = presentedHash;
  const result = await Session.updateOne(filter, { $set: set });
  return result.modifiedCount === 1 ? token : null;
}

// Used by the "protect" middleware on every request. Returns { ok: true, session, newToken } or { ok: false, code, message }.
export async function validateSessionToken(token, req, at = now()) {
  const presentedHash = hashToken(token);
  let session = await Session.findOne({ tokenHash: presentedHash });
  const fromPrevious = !session;
  if (!session) session = await Session.findOne({ previousTokenHash: presentedHash });
  if (!session) return fail('SESSION_EXPIRED');

  const ended = endedCode(session, at);
  if (ended) return fail(ended);

  // A session belongs to one browser, system and kind of device. If its cookie shows up anywhere else (copied cookie,
  // or a phone switched to "Desktop site"), the session ends.
  if (!sameBinding(bindingFromUserAgent(req.get('user-agent')), session.binding)) {
    await revokeSession(session._id, 'context_changed', at);
    return fail('SESSION_CONTEXT_CHANGED');
  }

  const ip = normalizeIp(req.ip);
  let rotated = null;
  if (fromPrevious) {
    if (at.getTime() - session.rotatedAt.getTime() > ROTATION_GRACE_MS) {
      // The old token after the grace period. If the new token never came back from any browser, the answer that carried
      // it was probably lost (dropped connection), so the same address gets a fresh one. Otherwise someone is using a
      // copied token, and the whole session is ended.
      const lostAnswer =
        !session.tokenUsedAt && at.getTime() - session.rotatedAt.getTime() <= RECOVERY_WINDOW_MS && ip === session.rotatedIp;
      if (!lostAnswer) {
        await revokeSession(session._id, 'token_reuse', at);
        return fail('SESSION_REVOKED');
      }
      rotated = await rotateToken(session, { fromPrevious: true, presentedHash, at, ip });
    }
  } else {
    if (!session.tokenUsedAt) {
      await Session.updateOne({ _id: session._id, tokenHash: presentedHash, tokenUsedAt: null }, { $set: { tokenUsedAt: at } });
    }
    if (at.getTime() - session.rotatedAt.getTime() >= ROTATE_AFTER_MS) {
      rotated = await rotateToken(session, { fromPrevious: false, presentedHash, at, ip });
    }
  }

  if (at.getTime() - session.lastActiveAt.getTime() >= ACTIVITY_WRITE_MS || session.lastIp !== ip) {
    await Session.updateOne({ _id: session._id }, { $set: { lastActiveAt: at, lastIp: ip } });
  }
  return { ok: true, session, newToken: rotated };
}

// A new token for the same session (used when the browser never received the answer to a correct sign-in code).
export async function reissueSessionToken(session, at, ip) {
  const token = newToken();
  await Session.updateOne(
    { _id: session._id, revokedAt: null },
    { $set: { tokenHash: hashToken(token), previousTokenHash: session.tokenHash, rotatedAt: at, rotatedIp: ip, tokenUsedAt: null } },
  );
  return token;
}

export async function revokeSession(sessionId, reason, at = now()) {
  const result = await Session.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: at, revokedReason: reason } });
  return result.modifiedCount;
}

export async function revokeSessionByToken(token, reason, at = now()) {
  const hash = hashToken(token);
  const result = await Session.updateOne(
    { $or: [{ tokenHash: hash }, { previousTokenHash: hash }], revokedAt: null },
    { $set: { revokedAt: at, revokedReason: reason } },
  );
  return result.modifiedCount;
}

// Ends the account's active sessions, optionally all but one, or only those of one device.
export async function revokeUserSessions(userId, reason, { exceptId, deviceId, at = now() } = {}) {
  const filter = { user: userId, revokedAt: null, expiresAt: { $gt: at } };
  if (exceptId) filter._id = { $ne: exceptId };
  if (deviceId) filter.device = deviceId;
  const result = await Session.updateMany(filter, { $set: { revokedAt: at, revokedReason: reason } });
  return result.modifiedCount;
}

// After a successful password reset: every session ends, every device loses its trust (it needs an email code again)
// and unfinished sign-ins that passed the OLD password are cancelled.
export async function revokeAllAccess(userId, at = now()) {
  const pending = await LoginChallenge.find({ user: userId, status: 'pending' }, { _id: 1, loginActivity: 1 }).lean();
  const [sessionsEnded] = await Promise.all([
    revokeUserSessions(userId, 'password_reset', { at }),
    Device.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: at, revokedReason: 'password_reset' } }),
    LoginChallenge.updateMany({ _id: { $in: pending.map((c) => c._id) }, status: 'pending' }, { $set: { status: 'cancelled' }, $unset: { codeHash: 1 } }),
    LoginActivity.updateMany(
      { _id: { $in: pending.map((c) => c.loginActivity) }, status: 'otp_pending' },
      { $set: { status: 'failed', reason: 'otp_cancelled', completedAt: at } },
    ),
  ]);
  return sessionsEnded;
}
