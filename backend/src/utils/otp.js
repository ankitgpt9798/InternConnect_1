import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp.js';

export const OTP_MINUTES = 10; // how long a code works
export const OTP_RESEND_SECONDS = 60; // wait before a new code can be sent

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
