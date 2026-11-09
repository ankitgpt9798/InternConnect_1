import mongoose from 'mongoose';
import { bindingField, browserField, DEVICE_CLASSES, locationField, osField, OTP_REASONS, PURGE_INDEX, purgeField, timestamps } from './securityFields.js';

// Module 6: the email-code step of one sign-in (or registration) — also the log of the codes sent and entered.
// The browser that typed the correct password holds a random challenge token in a cookie; only its SHA-256 hash is
// stored here, so a code works only in that browser. The code itself is stored only as a bcrypt hash, removed as soon
// as the challenge ends. Kept for 90 days.
export const CHALLENGE_STATUSES = ['pending', 'verified', 'expired', 'locked', 'delivery_failed', 'superseded', 'cancelled', 'window_closed'];

const loginChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loginActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginActivity', required: true },
    purpose: { type: String, enum: ['login', 'register'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    // Identifies the browser (device cookie, IP address and User-Agent, hashed) so a double-click does not send two emails.
    clientKey: { type: String, required: true },
    codeHash: { type: String, default: null },
    status: { type: String, enum: CHALLENGE_STATUSES, default: 'pending' },
    reasons: [{ type: String, enum: OTP_REASONS }],
    sends: [{ _id: false, at: Date, delivered: Boolean }],
    lastSentAt: { type: Date, required: true },
    resendCount: { type: Number, default: 0 },
    codeExpiresAt: { type: Date, required: true }, // 10 minutes after the latest code
    expiresAt: { type: Date, required: true }, // 30 minutes after the password step
    attempts: { type: Number, default: 0 }, // wrong codes for the current code
    attemptLog: [
      {
        _id: false,
        at: Date,
        ip: String,
        result: { type: String, enum: ['wrong', 'correct', 'expired', 'locked', 'window_closed'] },
      },
    ],
    // The browser that passed the password step, used to create its session and device record after the code.
    client: {
      browser: browserField,
      os: osField,
      deviceClass: { type: String, enum: DEVICE_CLASSES, default: 'unknown' },
      model: { type: String, default: '' },
      ip: { type: String, default: '' },
      binding: bindingField,
      location: locationField,
    },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null }, // the device record it may renew
    verifiedAt: { type: Date, default: null },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    purgeAt: purgeField,
  },
  { timestamps },
);

loginChallengeSchema.index({ user: 1, clientKey: 1, status: 1, createdAt: -1 });
loginChallengeSchema.index({ status: 1, expiresAt: 1 });
loginChallengeSchema.index(...PURGE_INDEX);

const LoginChallenge = mongoose.model('LoginChallenge', loginChallengeSchema);

export default LoginChallenge;
