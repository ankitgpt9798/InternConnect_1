import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';

export const OTP_MINUTES = 10; // how long a code works
export const OTP_RESEND_SECONDS = 60; // wait before a new code can be sent
export const OTP_MAX_ATTEMPTS = 5; // wrong codes allowed before a new code is needed

// A 6-digit code from a cryptographically secure random generator, e.g. "048213".
export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

// Seconds until a new code may be sent for this purpose (0 = now).
export async function secondsUntilResend(userId, purpose, now = new Date()) {
  const existing = await Otp.findOne({ user: userId, purpose });
  if (!existing) return 0;
  const waited = (now.getTime() - existing.sentAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - waited));
}

// Creates a new code (replacing any earlier one) and returns it in plain text so it can be sent.
export async function createOtp(userId, purpose, now = new Date()) {
  const code = generateOtp();
  await Otp.findOneAndUpdate(
    { user: userId, purpose },
    {
      codeHash: await bcrypt.hash(code, 10),
      attempts: 0,
      sentAt: now,
      expiresAt: new Date(now.getTime() + OTP_MINUTES * 60 * 1000),
    },
    { upsert: true },
  );
  return code;
}

export const deleteOtp = (userId, purpose) => Otp.deleteOne({ user: userId, purpose });

// Checks a code typed by the student. Returns { ok: true } (the code is then used up),
// or { ok: false, reason: 'expired' | 'locked' | 'wrong', attemptsLeft }.
export async function verifyOtp(userId, purpose, code, now = new Date()) {
  const otp = await Otp.findOne({ user: userId, purpose });
  if (!otp || otp.expiresAt <= now) return { ok: false, reason: 'expired', attemptsLeft: 0 };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: 'locked', attemptsLeft: 0 };

  if (!(await bcrypt.compare(code, otp.codeHash))) {
    const updated = await Otp.findOneAndUpdate({ _id: otp._id }, { $inc: { attempts: 1 } }, { returnDocument: 'after' });
    const attemptsLeft = Math.max(0, OTP_MAX_ATTEMPTS - (updated?.attempts ?? OTP_MAX_ATTEMPTS));
    return { ok: false, reason: attemptsLeft === 0 ? 'locked' : 'wrong', attemptsLeft };
  }

  // A code works only once: of two requests with the same code, only the one that deletes it succeeds.
  const used = await Otp.deleteOne({ _id: otp._id, attempts: otp.attempts });
  return used.deletedCount === 1 ? { ok: true } : { ok: false, reason: 'expired', attemptsLeft: 0 };
}

// What the student sees when a code is not accepted.
export function otpErrorMessage({ reason, attemptsLeft }) {
  if (reason === 'wrong') return `Incorrect code. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`;
  if (reason === 'locked') return 'Too many incorrect codes. Please ask for a new code.';
  return 'This code has expired or was already used. Please ask for a new code.';
}
