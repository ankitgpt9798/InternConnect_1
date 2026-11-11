import bcrypt from 'bcryptjs';
import LoginActivity from '../models/LoginActivity.js';
import LoginChallenge from '../models/LoginChallenge.js';
import { DAY_MS, LOG_RETENTION_DAYS } from '../models/securityFields.js';
import { CHALLENGE_COOKIE, readDeviceCookie, setChallengeCookie, setDeviceCookie, setSessionCookie } from './authCookie.js';
import { getClientInfo, sanitizeClientHints } from './clientInfo.js';
import { now } from './clock.js';
import { saveDevice } from './deviceTrust.js';
import { lookupLocation } from './geoip.js';
import { maskEmail } from './mask.js';
import { generateOtp, OTP_MAX_ATTEMPTS, OTP_MINUTES, OTP_RESEND_SECONDS } from './otp.js';
import { sendNewIpAlertEmail, sendSignInCodeEmail } from './securityEmail.js';
import { createSession } from './sessions.js';
import { OTP_CODES_PER_HOUR, takeQuota } from './throttle.js';
import { hashToken, newToken } from './tokens.js';

// Module 6: the steps shared by login and registration (history records, email codes, sessions).
const MINUTE = 60_000;
export const CHALLENGE_MINUTES = 30; // a sign-in must be finished within 30 minutes of the password step
export const MAX_RESENDS = 3;

// The answer when a phone or tablet tries to sign in outside 10:00 AM–1:00 PM IST.
export const windowClosedBody = (window) => ({
  code: 'MOBILE_LOGIN_WINDOW',
  message: 'Phones and tablets can sign in only between 10:00 AM and 1:00 PM IST.',
  opensAt: window.opensAt,
  closesAt: window.closesAt,
  serverTime: window.serverTime,
});

// The time, browser/device and approximate location of a request.
export function requestContext(req) {
  const client = getClientInfo(req, sanitizeClientHints(req.body?.client));
  return { at: now(), client, location: lookupLocation(client.ip) };
}

export const purgeDate = (at) => new Date(at.getTime() + LOG_RETENTION_DAYS * DAY_MS);

// One row of the login history.
export function recordActivity({ user, event, status, reason = null, ctx, ...rest }) {
  const { at, client, location } = ctx;
  return LoginActivity.create({
    user: user?._id ?? null,
    event,
    status,
    reason,
    browser: client.browser,
    os: client.os,
    deviceClass: client.deviceClass,
    model: client.model,
    userAgent: client.userAgent,
    ip: client.ip,
    location,
    completedAt: status === 'otp_pending' ? null : at,
    purgeAt: purgeDate(at),
    ...rest,
  });
}

// What the risk rules need to know about this account's earlier successful sign-ins.
export async function riskInputs(userId, client, location, at) {
  const knownCountry = location.kind === 'approximate' && location.countryCode;
  const [ipSeen, countrySeen, browserSeen, failures] = await Promise.all([
    LoginActivity.exists({ user: userId, status: 'success', ip: client.ip }),
    knownCountry ? LoginActivity.exists({ user: userId, status: 'success', 'location.countryCode': location.countryCode }) : null,
    LoginActivity.exists({ user: userId, status: 'success', 'browser.name': client.browser.name }),
    LoginActivity.aggregate([
      { $match: { user: userId, status: 'failed', reason: 'wrong_password', ip: { $ne: client.ip }, createdAt: { $gte: new Date(at.getTime() - DAY_MS) } } },
      { $group: { _id: null, count: { $sum: 1 }, ips: { $addToSet: '$ip' } } },
    ]),
  ]);
  const recent = failures[0];
  return {
    ipSeen: Boolean(ipSeen),
    locationKnown: Boolean(knownCountry),
    countrySeen: Boolean(countrySeen),
    browserSeen: Boolean(browserSeen),
    recentFailures: Boolean(recent && recent.count >= 10 && recent.ips.length >= 3),
  };
}

export function challengeBody(challenge, user, at) {
  const destination = maskEmail(user.email);
  return {
    code: 'OTP_REQUIRED',
    message: `We sent a 6-digit code to ${destination}.`,
    purpose: challenge.purpose,
    reasons: challenge.reasons,
    destination,
    codeExpiresAt: challenge.codeExpiresAt,
    resendAvailableAt: new Date(challenge.lastSentAt.getTime() + OTP_RESEND_SECONDS * 1000),
    resendsLeft: Math.max(0, MAX_RESENDS - challenge.resendCount),
    attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - challenge.attempts),
    serverTime: at,
  };
}

// Ends a challenge that never got its code (expired, locked, cancelled…) and closes its history row.
export async function finishChallenge(challenge, status, reason, at) {
  await LoginChallenge.updateOne({ _id: challenge._id, status: 'pending' }, { $set: { status }, $unset: { codeHash: 1 } });
  await LoginActivity.updateOne({ _id: challenge.loginActivity, status: 'otp_pending' }, { $set: { status: 'failed', reason, completedAt: at } });
}

const DUPLICATE_MS = 5000; // a second request this soon after the first is a double click (or a retry) still on its way

// When the same browser key started a sign-in in the last minute: is THIS request a duplicate of it? Only then does it
// get the code already sent (no second email). It is a duplicate if it carries that sign-in's own cookie (the same
// window asking again), or if it came within 5 seconds (a double click whose first answer has not arrived yet). A code
// that was already used or cancelled, or one that another window of the same browser started earlier, is not a reason
// to make this request wait: it becomes a new sign-in (the hourly and resend limits still apply).
async function duplicateOf({ userId, clientKey, cookieToken, startedAt, at }) {
  for (let tryNumber = 0; tryNumber < 30; tryNumber += 1) {
    const latest = await LoginChallenge.findOne({ user: userId, clientKey, createdAt: { $gte: startedAt } }).sort({ createdAt: -1 });
    if (latest) {
      if (latest.status !== 'pending') return null;
      if (cookieToken && hashToken(cookieToken) === latest.tokenHash) return latest;
      return at.getTime() - latest.createdAt.getTime() <= DUPLICATE_MS ? latest : null;
    }
    // Not created yet. Only a request that is still on its way is worth waiting for (hashing takes a moment under load).
    if (at.getTime() - startedAt.getTime() > DUPLICATE_MS) return null;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

// Earlier unfinished codes for this browser are replaced by the new one.
async function supersedePending({ userId, clientKey, cookieToken, at }) {
  const sameBrowser = [{ user: userId, clientKey }];
  if (cookieToken) sameBrowser.push({ tokenHash: hashToken(cookieToken) });
  const stale = await LoginChallenge.find({ status: 'pending', $or: sameBrowser }, { _id: 1, loginActivity: 1 }).lean();
  if (stale.length === 0) return;
  await LoginChallenge.updateMany({ _id: { $in: stale.map((c) => c._id) }, status: 'pending' }, { $set: { status: 'superseded' }, $unset: { codeHash: 1 } });
  await LoginActivity.updateMany(
    { _id: { $in: stale.map((c) => c.loginActivity) }, status: 'otp_pending' },
    { $set: { status: 'failed', reason: 'otp_superseded', completedAt: at } },
  );
}

// After a correct password (or a new registration) when an email code is needed: creates the challenge, emails the
// code and answers 202. A duplicate request (double click, same window again) gets the code already sent.
export async function startChallenge({ req, res, user, purpose, decision, flags, deviceId = null, ctx }) {
  const { at, client, location } = ctx;
  const clientKey = hashToken(`${readDeviceCookie(req, user._id) ?? ''}|${client.ip}|${client.userAgent}`);
  const cookieToken = req.cookies?.[CHALLENGE_COOKIE];
  const history = { otpReasons: decision.otpReasons, risk: decision.risk, flags };
  const startWindowMs = OTP_RESEND_SECONDS * 1000;

  // Of several requests at the same moment, only the first starts a sign-in; the others look for its code.
  const start = await takeQuota(`otp_start:${user._id}:${clientKey}`, { windowMs: startWindowMs, max: 1 }, at);
  if (!start.ok) {
    const startedAt = new Date(at.getTime() + start.retryAfterMs - startWindowMs); // when that first request started
    const existing = await duplicateOf({ userId: user._id, clientKey, cookieToken, startedAt, at });
    if (existing) return res.status(202).json(challengeBody(existing, user, at));
  }
  const releaseStart = () => (start.ok ? start.release() : undefined);

  await supersedePending({ userId: user._id, clientKey, cookieToken, at });

  const quota = await takeQuota(`otp:${user._id}`, { windowMs: 60 * MINUTE, max: OTP_CODES_PER_HOUR }, at);
  if (!quota.ok) {
    await releaseStart();
    await recordActivity({ user, event: purpose, status: 'rate_limited', reason: 'otp_hourly_limit', ctx, ...history });
    const seconds = Math.ceil(quota.retryAfterMs / 1000);
    return res.status(429).json({
      code: 'OTP_HOURLY_LIMIT',
      message: `Too many codes were sent to this account. Please try again in ${Math.ceil(seconds / 60)} minutes.`,
      retryAfterSeconds: seconds,
    });
  }

  const token = newToken();
  const code = generateOtp();
  const activity = await recordActivity({ user, event: purpose, status: 'otp_pending', verification: 'email_otp', ctx, ...history });
  const challenge = await LoginChallenge.create({
    user: user._id,
    loginActivity: activity._id,
    purpose,
    tokenHash: hashToken(token),
    clientKey,
    codeHash: await bcrypt.hash(code, 10),
    reasons: decision.otpReasons,
    sends: [{ at, delivered: false }],
    lastSentAt: at,
    codeExpiresAt: new Date(at.getTime() + OTP_MINUTES * MINUTE),
    expiresAt: new Date(at.getTime() + CHALLENGE_MINUTES * MINUTE),
    client: { browser: client.browser, os: client.os, deviceClass: client.deviceClass, model: client.model, ip: client.ip, binding: client.binding, location },
    device: deviceId,
    purgeAt: purgeDate(at),
  });
  await LoginActivity.updateOne({ _id: activity._id }, { $set: { challenge: challenge._id } });

  try {
    await sendSignInCodeEmail({ user, code, purpose, reasons: decision.otpReasons, client, location, at });
  } catch (error) {
    // Nothing counts against the student when the email could not be sent: they can try again at once.
    console.error('The sign-in code email could not be sent:', error.message);
    await Promise.all([
      LoginChallenge.updateOne({ _id: challenge._id }, { $set: { status: 'delivery_failed' }, $unset: { codeHash: 1 } }),
      LoginActivity.updateOne({ _id: activity._id }, { $set: { status: 'failed', reason: 'otp_delivery_failed', completedAt: at } }),
      releaseStart(),
      quota.release(),
    ]);
    return res.status(502).json({
      code: 'OTP_DELIVERY_FAILED',
      message:
        purpose === 'register'
          ? 'Your account was created, but the code could not be sent. Please log in to get a new code.'
          : 'The code could not be sent. Please try again.',
      ...(purpose === 'register' && { accountCreated: true }),
    });
  }
  await LoginChallenge.updateOne({ _id: challenge._id }, { $set: { 'sends.0.delivered': true } });

  setChallengeCookie(res, token, challenge.expiresAt, at);
  return res.status(202).json(challengeBody(challenge, user, at));
}

// Creates the session and saves (or renews) the device record with a new token. Cookies are set by the caller,
// after a database transaction has been committed.
export async function issueSession({ userId, device, trust, client, location, via, activityId, at, dbSession }) {
  const saved = await saveDevice({ userId, device, client, location, trust, at, dbSession });
  const created = await createSession({ userId, deviceId: saved.device._id, loginActivityId: activityId, client, location, via, at, dbSession });
  return { session: created.session, sessionToken: created.token, device: saved.device, deviceToken: saved.token };
}

export function setSignInCookies(res, userId, issued, at) {
  setSessionCookie(res, issued.sessionToken, issued.session.expiresAt, at);
  setDeviceCookie(res, userId, issued.deviceToken);
}

// R5: a trusted device on a new IP address signs in without a code, and the student gets an alert email
// (at most one per IP address per day). A failed email never blocks the sign-in.
export async function sendNewIpAlertOnce({ user, ctx }) {
  const { at, client, location } = ctx;
  try {
    const quota = await takeQuota(`alert:${user._id}:${client.ip}`, { windowMs: DAY_MS, max: 1 }, at);
    if (quota.ok) await sendNewIpAlertEmail({ user, client, location, at });
  } catch (error) {
    console.error('The new sign-in alert email could not be sent:', error.message);
  }
}
