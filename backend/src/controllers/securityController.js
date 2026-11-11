import mongoose from 'mongoose';
import Device from '../models/Device.js';
import LoginActivity from '../models/LoginActivity.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { clearDeviceCookie, clearSessionCookie } from '../utils/authCookie.js';
import { now } from '../utils/clock.js';
import { isTrustedDevice, revokeDevice } from '../utils/deviceTrust.js';
import { normalizeIp } from '../utils/ip.js';
import { revokeSession, revokeUserSessions } from '../utils/sessions.js';
import { reserveLoginAttempt } from '../utils/throttle.js';
import { cooldownBody } from './loginController.js';

// Module 6: the student's own login history, active sessions and devices. Every query is limited to req.user, so
// nobody can see or end another student's sessions; IP addresses and device details are never shown to other users.
const HISTORY_DEFAULT = 20;
const HISTORY_MAX = 50;

const sameId = (a, b) => Boolean(a && b) && String(a) === String(b);
const notFound = (res, code, message) => res.status(404).json({ code, message });
const publicLocation = (location) =>
  location?.kind === 'approximate'
    ? { kind: 'approximate', city: location.city, region: location.region, country: location.country, countryCode: location.countryCode }
    : { kind: location?.kind ?? 'unknown' };

// Signing other sessions out or removing a device needs the password again, so someone who only has a copied session
// cookie cannot lock the real student out. Wrong passwords count towards the same limits as logins.
async function confirmPassword(req, res) {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    res.status(400).json({ code: 'PASSWORD_REQUIRED', message: 'Enter your password to confirm.' });
    return false;
  }
  const gate = await reserveLoginAttempt({ userId: req.user._id, ip: normalizeIp(req.ip), skipIpLimit: true, at: now() });
  if (!gate.ok) {
    res.status(429).json(cooldownBody(gate));
    return false;
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(password))) {
    await gate.failed();
    res.status(403).json({ code: 'PASSWORD_INCORRECT', message: 'Incorrect password.' });
    return false;
  }
  await gate.succeeded();
  return true;
}

function historyItem(row, currentSessionId, at) {
  let { status, reason } = row;
  // A code nobody entered in time (the sweep marks it within a minute; this shows it at once).
  if (status === 'otp_pending' && row.challenge && (row.challenge.status !== 'pending' || at >= row.challenge.expiresAt)) {
    status = 'failed';
    reason = 'otp_expired';
  }
  const entered = (row.challenge?.attemptLog ?? []).filter((entry) => entry.result === 'wrong' || entry.result === 'correct').length;
  return {
    id: row._id,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    event: row.event,
    status,
    reason,
    verification: row.verification,
    otpReasons: row.otpReasons ?? [],
    otp: row.challenge ? { codesSent: row.challenge.sends?.length ?? 0, codesEntered: entered } : null,
    risk: row.risk?.level ?? 'low',
    flags: row.flags ?? {},
    browser: row.browser,
    os: row.os,
    deviceClass: row.deviceClass,
    model: row.model,
    ip: row.ip,
    location: publicLocation(row.location),
    currentSession: sameId(row.session, currentSessionId),
  };
}

// GET /api/users/me/login-history?before=<id>&limit=20 — newest first.
export async function getLoginHistory(req, res) {
  const limit = Math.min(HISTORY_MAX, Math.max(1, Number.parseInt(req.query.limit, 10) || HISTORY_DEFAULT));
  const filter = { user: req.user._id };
  if (req.query.before) {
    if (!mongoose.isValidObjectId(req.query.before)) return res.status(400).json({ code: 'BAD_CURSOR', message: 'Invalid page.' });
    filter._id = { $lt: req.query.before };
  }
  const at = now();
  const rows = await LoginActivity.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate('challenge', 'status expiresAt sends attemptLog')
    .lean();
  const items = rows.slice(0, limit).map((row) => historyItem(row, req.authSession._id, at));
  res.json({ items, nextCursor: rows.length > limit ? String(items[items.length - 1].id) : null });
}

// GET /api/users/me/sessions — browsers where the account is signed in now.
export async function getSessions(req, res) {
  const at = now();
  const sessions = await Session.find({ user: req.user._id, revokedAt: null, expiresAt: { $gt: at } })
    .sort({ lastActiveAt: -1 })
    .populate('device', 'trustedAt trustExpiresAt revokedAt')
    .lean();
  res.json({
    sessions: sessions.map((session) => ({
      id: session._id,
      current: sameId(session._id, req.authSession._id),
      browser: session.browser,
      os: session.os,
      deviceClass: session.deviceClass,
      model: session.model,
      ip: session.lastIp || session.ip,
      location: publicLocation(session.location),
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      trustedDevice: isTrustedDevice(session.device, at),
    })),
    serverTime: at,
  });
}

// POST /api/users/me/sessions/:id/revoke  { password }
export async function revokeSessionById(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'SESSION_NOT_FOUND', 'Session not found.');
  if (!(await confirmPassword(req, res))) return undefined;
  const at = now();
  const session = await Session.findOne({ _id: req.params.id, user: req.user._id, revokedAt: null, expiresAt: { $gt: at } });
  if (!session) return notFound(res, 'SESSION_NOT_FOUND', 'Session not found.');

  await revokeSession(session._id, 'user_revoked', at);
  const current = sameId(session._id, req.authSession._id);
  if (current) clearSessionCookie(res);
  res.json({ revoked: true, current });
}

// POST /api/users/me/sessions/revoke-others  { password }
export async function revokeOtherSessions(req, res) {
  if (!(await confirmPassword(req, res))) return undefined;
  const revokedCount = await revokeUserSessions(req.user._id, 'revoke_others', { exceptId: req.authSession._id, at: now() });
  res.json({ revokedCount });
}

// GET /api/users/me/devices — browsers this account has signed in from, and whether they are trusted.
export async function getDevices(req, res) {
  const at = now();
  const devices = await Device.find({ user: req.user._id, revokedAt: null }).sort({ lastSeenAt: -1 }).lean();
  res.json({
    devices: devices.map((device) => ({
      id: device._id,
      current: sameId(device._id, req.authSession.device),
      browser: device.browser,
      os: device.os,
      deviceClass: device.deviceClass,
      model: device.model,
      firstSeenAt: device.firstSeenAt,
      lastSeenAt: device.lastSeenAt,
      lastIp: device.lastIp,
      lastLocation: publicLocation(device.lastLocation),
      trusted: isTrustedDevice(device, at),
      trustedAt: device.trustedAt,
      trustExpiresAt: device.trustExpiresAt,
    })),
    serverTime: at,
  });
}

// POST /api/users/me/devices/:id/remove  { password } — ends its sessions; its next sign-in needs an email code.
export async function removeDevice(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res, 'DEVICE_NOT_FOUND', 'Device not found.');
  if (!(await confirmPassword(req, res))) return undefined;
  const at = now();
  const device = await Device.findOne({ _id: req.params.id, user: req.user._id, revokedAt: null });
  if (!device) return notFound(res, 'DEVICE_NOT_FOUND', 'Device not found.');

  await revokeDevice(device._id, 'user_removed', at);
  const sessionsEnded = await revokeUserSessions(req.user._id, 'device_removed', { deviceId: device._id, at });
  const current = sameId(device._id, req.authSession.device);
  if (current) {
    clearSessionCookie(res);
    clearDeviceCookie(res, req.user._id);
  }
  res.json({ removed: true, sessionsEnded, current });
}
