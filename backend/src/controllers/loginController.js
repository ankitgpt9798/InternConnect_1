import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import Device from '../models/Device.js';
import LoginActivity from '../models/LoginActivity.js';
import LoginChallenge from '../models/LoginChallenge.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { CHALLENGE_COOKIE, clearChallengeCookie, readDeviceCookie, setDeviceCookie, setSessionCookie } from '../utils/authCookie.js';
import { now } from '../utils/clock.js';
import { deviceStateOf, findDevice, revokeDevice, saveDevice } from '../utils/deviceTrust.js';
import { normalizeIp } from '../utils/ip.js';
import {
  challengeBody,
  finishChallenge,
  issueSession,
  MAX_RESENDS,
  recordActivity,
  requestContext,
  riskInputs,
  sendNewIpAlertOnce,
  setSignInCookies,
  startChallenge,
  windowClosedBody,
} from '../utils/loginFlow.js';
import { assessSignIn } from '../utils/loginPolicy.js';
import { isRestrictedDevice, mobileWindowStatus } from '../utils/mobileLoginWindow.js';
import { generateOtp, OTP_MAX_ATTEMPTS, OTP_MINUTES, OTP_RESEND_SECONDS } from '../utils/otp.js';
import { sendSignInCodeEmail } from '../utils/securityEmail.js';
import { reissueSessionToken, sessionInfo } from '../utils/sessions.js';
import { OTP_CODES_PER_HOUR, reserveLoginAttempt, takeQuota } from '../utils/throttle.js';
import { hashToken } from '../utils/tokens.js';
import { userResponse } from '../utils/userResponse.js';
import { toText } from '../utils/validators.js';

// Module 6 sign-in: password -> (rules) -> session, or -> email code -> session.
const MINUTE = 60_000;
const REPLAY_WINDOW_MS = 2 * MINUTE; // a repeated correct code within 2 minutes gets the same session
const SIMULTANEOUS_MS = 3000; // ...and within 3 seconds it is a double submit: the first answer sets the cookies
const LOCKED_MESSAGE = 'Too many incorrect codes. Please log in again to get a new code.';

// Checking a password against this hash takes as long as a real one, so an unknown account answers just as slowly.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

const noChallenge = (res, message = 'Your sign-in has ended. Please log in again.') => {
  clearChallengeCookie(res);
  return res.status(401).json({ code: 'NO_CHALLENGE', message });
};

// The answer during a cooldown (also used when confirming a password on the dashboard).
export function cooldownBody(gate) {
  const seconds = Math.max(1, Math.ceil(gate.retryAfterMs / 1000));
  return gate.busy
    ? { code: 'LOGIN_BUSY', message: 'Too many sign-in attempts at the same time. Please try again in a moment.', retryAfterSeconds: seconds }
    : { code: 'LOGIN_COOLDOWN', message: `Too many failed attempts. Please try again in ${seconds} seconds.`, retryAfterSeconds: seconds };
}

const challengeFromCookie = (req) => {
  const token = req.cookies?.[CHALLENGE_COOKIE];
  return token ? LoginChallenge.findOne({ tokenHash: hashToken(token) }) : null;
};

// POST /api/auth/login  { identifier: email or phone, password, client? }
export async function login(req, res) {
  const body = req.body ?? {};
  const identifier = toText(body.identifier).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (!identifier || !password) {
    return res.status(400).json({ code: 'VALIDATION', message: 'Enter your email or phone number and your password.' });
  }

  const ctx = requestContext(req);
  const { at, client, location } = ctx;
  // An "@" means an email address; anything else is treated as a phone number.
  const user = await User.findOne(identifier.includes('@') ? { email: identifier } : { phone: identifier }).select('+password');

  // 1. Phones and tablets only from 10:00 AM to 1:00 PM IST. Checked before the password, so a refused attempt tells
  //    nothing about the password and no code is sent.
  const window = mobileWindowStatus(at);
  if (isRestrictedDevice(client.deviceClass) && !window.open) {
    await recordActivity({ user, event: 'login', status: 'blocked', reason: 'outside_mobile_window', ctx });
    return res.status(403).json(windowClosedBody(window));
  }

  // 2. This browser's device record for the account, if it has one.
  const device = user ? await findDevice(user._id, readDeviceCookie(req, user._id)) : null;
  const deviceState = deviceStateOf(device, client.binding, at);

  // 3. Progressive cooldowns for this account from this IP address, and for this IP address.
  const gate = await reserveLoginAttempt({ userId: user?._id, ip: client.ip, skipIpLimit: deviceState === 'trusted', at });
  if (!gate.ok) {
    await recordActivity({ user, event: 'login', status: 'rate_limited', reason: gate.scope === 'ip' ? 'cooldown_ip' : 'cooldown_account_ip', ctx });
    return res.status(429).json(cooldownBody(gate));
  }

  // 4. The password. The same message for an unknown account and a wrong password.
  let passwordOk = false;
  if (user) passwordOk = await user.matchPassword(password);
  else await bcrypt.compare(password, DUMMY_HASH);
  if (!passwordOk) {
    await gate.failed();
    await recordActivity({ user, event: 'login', status: 'failed', reason: user ? 'wrong_password' : 'unknown_account', ctx });
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Incorrect email/phone or password.' });
  }
  await gate.succeeded();

  // 5. Risk assessment and the sign-in rules.
  if (deviceState === 'mismatch') await revokeDevice(device._id, 'mismatch', at);
  const inputs = await riskInputs(user._id, client, location, at);
  const decision = assessSignIn({ purpose: 'login', isChrome: client.isChrome, deviceState, ...inputs });
  const flags = { newDevice: deviceState === 'new' || deviceState === 'mismatch', newBrowser: !inputs.browserSeen, newIp: !inputs.ipSeen };

  if (decision.requireOtp) {
    const keepDevice = deviceState === 'trusted' || deviceState === 'untrusted' ? device._id : null;
    return startChallenge({ req, res, user, purpose: 'login', decision, flags, deviceId: keepDevice, ctx });
  }

  // A trusted device (not Chrome) with nothing unusual: signed in with the password alone.
  const activity = await recordActivity({ user, event: 'login', status: 'success', ctx, otpReasons: [], risk: decision.risk, flags });
  const issued = await issueSession({ userId: user._id, device, trust: false, client, location, via: 'password', activityId: activity._id, at });
  await LoginActivity.updateOne({ _id: activity._id }, { $set: { session: issued.session._id, device: issued.device._id } });
  setSignInCookies(res, user._id, issued, at);
  if (decision.sendNewIpAlert) await sendNewIpAlertOnce({ user, ctx });
  res.json({ user: userResponse(user), session: sessionInfo(issued.session, at) });
}

class AlreadyVerified extends Error {}

// A correct code that arrives again from the same browser: a double submit, or the first answer was lost.
async function replayVerified(req, res, challenge, at) {
  const age = challenge.verifiedAt ? at.getTime() - challenge.verifiedAt.getTime() : Infinity;
  const session =
    challenge.session && age <= REPLAY_WINDOW_MS ? await Session.findOne({ _id: challenge.session, revokedAt: null, expiresAt: { $gt: at } }) : null;
  const user = session ? await User.findById(challenge.user) : null;
  if (!session || !user) return noChallenge(res, 'This code was already used. Please log in again.');

  if (age >= SIMULTANEOUS_MS) {
    // The first answer probably never reached this browser: it gets a new token for the same session.
    setSessionCookie(res, await reissueSessionToken(session, at, normalizeIp(req.ip)), session.expiresAt, at);
    const device = await Device.findOne({ _id: session.device, user: user._id, revokedAt: null });
    if (device) {
      const saved = await saveDevice({ userId: user._id, device, client: challenge.client, location: challenge.client.location, trust: false, at });
      setDeviceCookie(res, user._id, saved.token);
    }
  }
  clearChallengeCookie(res);
  return res.json({ user: userResponse(user), session: sessionInfo(session, at) });
}

// POST /api/auth/login/verify  { otp }  (with the sign-in challenge cookie)
export async function verifyLogin(req, res) {
  const otp = toText(req.body?.otp);
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ code: 'OTP_FORMAT', message: 'Enter the 6-digit code.' });

  const at = now();
  const ip = normalizeIp(req.ip);
  const challenge = await challengeFromCookie(req);
  if (!challenge) return noChallenge(res);
  if (challenge.status === 'verified') return replayVerified(req, res, challenge, at);
  if (challenge.status === 'locked') return res.status(429).json({ code: 'OTP_LOCKED', message: LOCKED_MESSAGE });
  if (challenge.status !== 'pending') return noChallenge(res);

  if (at >= challenge.expiresAt) {
    await finishChallenge(challenge, 'expired', 'otp_expired', at);
    clearChallengeCookie(res);
    return res.status(410).json({ code: 'CHALLENGE_EXPIRED', message: 'This sign-in has expired. Please log in again.' });
  }

  // Phones and tablets: the window must still be open at the moment access is granted.
  if (isRestrictedDevice(challenge.client.deviceClass)) {
    const window = mobileWindowStatus(at);
    if (!window.open) {
      await LoginChallenge.updateOne({ _id: challenge._id }, { $push: { attemptLog: { at, ip, result: 'window_closed' } } });
      await finishChallenge(challenge, 'window_closed', 'window_closed_at_verify', at);
      clearChallengeCookie(res);
      return res.status(403).json(windowClosedBody(window));
    }
  }

  if (at >= challenge.codeExpiresAt) {
    await LoginChallenge.updateOne({ _id: challenge._id }, { $push: { attemptLog: { at, ip, result: 'expired' } } });
    return res.status(410).json({
      code: 'OTP_EXPIRED',
      message: 'This code has expired. Please ask for a new code.',
      resendAvailableAt: new Date(challenge.lastSentAt.getTime() + OTP_RESEND_SECONDS * 1000),
      resendsLeft: Math.max(0, MAX_RESENDS - challenge.resendCount),
      serverTime: at,
    });
  }

  if (!challenge.codeHash || challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await finishChallenge(challenge, 'locked', 'otp_locked', at);
    clearChallengeCookie(res);
    return res.status(429).json({ code: 'OTP_LOCKED', message: LOCKED_MESSAGE });
  }

  if (!(await bcrypt.compare(otp, challenge.codeHash))) {
    const updated = await LoginChallenge.findOneAndUpdate(
      { _id: challenge._id, status: 'pending', attempts: { $lt: OTP_MAX_ATTEMPTS } },
      { $inc: { attempts: 1 }, $push: { attemptLog: { at, ip, result: 'wrong' } } },
      { returnDocument: 'after' },
    );
    const attemptsLeft = updated ? OTP_MAX_ATTEMPTS - updated.attempts : 0;
    if (attemptsLeft <= 0) {
      await LoginChallenge.updateOne({ _id: challenge._id }, { $push: { attemptLog: { at, ip, result: 'locked' } } });
      await finishChallenge(challenge, 'locked', 'otp_locked', at);
      clearChallengeCookie(res);
      return res.status(429).json({ code: 'OTP_LOCKED', message: LOCKED_MESSAGE });
    }
    return res.status(400).json({
      code: 'OTP_INVALID',
      message: `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`,
      attemptsLeft,
    });
  }

  // The right code: one transaction marks it used, trusts the device and creates the session. If two requests bring
  // the code at the same moment, only one can change the status; the other gets the same session.
  let issued = null;
  try {
    await mongoose.connection.transaction(async (dbSession) => {
      const won = await LoginChallenge.findOneAndUpdate(
        { _id: challenge._id, status: 'pending' },
        { $set: { status: 'verified', verifiedAt: at }, $unset: { codeHash: 1 }, $push: { attemptLog: { at, ip, result: 'correct' } } },
        { returnDocument: 'after', session: dbSession },
      );
      if (!won) throw new AlreadyVerified();
      const device = won.device ? await Device.findOne({ _id: won.device, user: won.user, revokedAt: null }).session(dbSession) : null;
      issued = await issueSession({
        userId: won.user,
        device,
        trust: true,
        client: won.client,
        location: won.client.location,
        via: 'email_otp',
        activityId: won.loginActivity,
        at,
        dbSession,
      });
      await LoginChallenge.updateOne({ _id: won._id }, { $set: { session: issued.session._id } }, { session: dbSession });
      await LoginActivity.updateOne(
        { _id: won.loginActivity },
        { $set: { status: 'success', completedAt: at, session: issued.session._id, device: issued.device._id } },
        { session: dbSession },
      );
    });
  } catch (error) {
    if (error instanceof AlreadyVerified) return replayVerified(req, res, await LoginChallenge.findById(challenge._id), at);
    throw error;
  }

  const user = await User.findById(challenge.user);
  setSignInCookies(res, user._id, issued, at);
  clearChallengeCookie(res);
  res.json({ user: userResponse(user), session: sessionInfo(issued.session, at) });
}

// POST /api/auth/login/resend  (with the sign-in challenge cookie)
export async function resendLoginCode(req, res) {
  const at = now();
  const challenge = await challengeFromCookie(req);
  if (!challenge || challenge.status !== 'pending') return noChallenge(res);
  if (at >= challenge.expiresAt) {
    await finishChallenge(challenge, 'expired', 'otp_expired', at);
    clearChallengeCookie(res);
    return res.status(410).json({ code: 'CHALLENGE_EXPIRED', message: 'This sign-in has expired. Please log in again.' });
  }
  if (challenge.resendCount >= MAX_RESENDS) {
    return res.status(429).json({ code: 'OTP_RESEND_LIMIT', message: 'No more codes can be sent for this sign-in. Please log in again later.' });
  }
  const availableAt = challenge.lastSentAt.getTime() + OTP_RESEND_SECONDS * 1000;
  if (at.getTime() < availableAt) {
    const seconds = Math.ceil((availableAt - at.getTime()) / 1000);
    return res.status(429).json({ code: 'OTP_RESEND_COOLDOWN', message: `Please wait ${seconds} seconds before requesting a new code.`, retryAfterSeconds: seconds });
  }

  const user = await User.findById(challenge.user);
  const quota = await takeQuota(`otp:${user._id}`, { windowMs: 60 * MINUTE, max: OTP_CODES_PER_HOUR }, at);
  if (!quota.ok) {
    const seconds = Math.ceil(quota.retryAfterMs / 1000);
    return res.status(429).json({
      code: 'OTP_HOURLY_LIMIT',
      message: `Too many codes were sent to this account. Please try again in ${Math.ceil(seconds / 60)} minutes.`,
      retryAfterSeconds: seconds,
    });
  }

  // Only one of several parallel resend requests can match the old send time, so only one email goes out.
  const code = generateOtp();
  const updated = await LoginChallenge.findOneAndUpdate(
    { _id: challenge._id, status: 'pending', lastSentAt: challenge.lastSentAt, resendCount: { $lt: MAX_RESENDS } },
    {
      $set: { codeHash: await bcrypt.hash(code, 10), codeExpiresAt: new Date(at.getTime() + OTP_MINUTES * MINUTE), lastSentAt: at, attempts: 0 },
      $inc: { resendCount: 1 },
      $push: { sends: { at, delivered: false } },
    },
    { returnDocument: 'after' },
  );
  if (!updated) {
    await quota.release();
    return res.status(429).json({ code: 'OTP_RESEND_COOLDOWN', message: 'A new code was just sent. Please check your email.', retryAfterSeconds: OTP_RESEND_SECONDS });
  }

  try {
    await sendSignInCodeEmail({ user, code, purpose: challenge.purpose, reasons: challenge.reasons, client: challenge.client, location: challenge.client.location, at });
  } catch (error) {
    // The old code keeps working and the student can try again at once.
    console.error('The sign-in code email could not be sent:', error.message);
    await LoginChallenge.updateOne(
      { _id: challenge._id, lastSentAt: at },
      {
        $set: { codeHash: challenge.codeHash, codeExpiresAt: challenge.codeExpiresAt, lastSentAt: challenge.lastSentAt, attempts: challenge.attempts },
        $inc: { resendCount: -1 },
      },
    );
    await quota.release();
    return res.status(502).json({ code: 'OTP_DELIVERY_FAILED', message: 'The code could not be sent. Please try again.' });
  }
  await LoginChallenge.updateOne({ _id: challenge._id }, { $set: { [`sends.${updated.sends.length - 1}.delivered`]: true } });
  res.json(challengeBody(updated, user, at));
}

// POST /api/auth/login/cancel  ("Use a different account")
export async function cancelLogin(req, res) {
  const challenge = await challengeFromCookie(req);
  if (challenge?.status === 'pending') await finishChallenge(challenge, 'cancelled', 'otp_cancelled', now());
  clearChallengeCookie(res);
  res.json({ message: 'Sign-in cancelled.' });
}
