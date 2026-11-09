import mongoose from 'mongoose';
import { bindingField, browserField, DEVICE_CLASSES, locationField, osField, PURGE_INDEX, purgeField, timestamps } from './securityFields.js';

// Module 6: one signed-in browser. The browser holds a random token in the httpOnly "token" cookie; only its SHA-256
// hash is stored. The token is replaced every 15 minutes (the previous one keeps working for 60 seconds, for requests
// already on their way). Every request checks this record, so signing a session out takes effect at once.
export const SESSION_END_REASONS = [
  'logout',
  'user_revoked',
  'revoke_others',
  'password_reset',
  'device_removed',
  'token_reuse',
  'context_changed',
  'expired',
  'mobile_window_ended',
];

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    loginActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginActivity', default: null },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String, default: null },
    rotatedAt: { type: Date, required: true },
    rotatedIp: { type: String, default: '' },
    tokenUsedAt: { type: Date, default: null }, // when the browser first sent the current token back
    binding: bindingField,
    deviceClass: { type: String, enum: DEVICE_CLASSES, required: true },
    browser: browserField,
    os: osField,
    model: { type: String, default: '' },
    ip: { type: String, default: '' },
    lastIp: { type: String, default: '' },
    location: locationField,
    lastActiveAt: { type: Date, required: true },
    // Computers: 7 days. Phones and tablets: 13:00:00 IST on the day of sign-in.
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: SESSION_END_REASONS, default: null },
    createdVia: { type: String, enum: ['password', 'email_otp'], required: true },
    purgeAt: purgeField, // 30 days after it ends
  },
  { timestamps },
);

sessionSchema.index({ previousTokenHash: 1 }, { partialFilterExpression: { previousTokenHash: { $type: 'string' } } });
sessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });
sessionSchema.index({ revokedAt: 1, expiresAt: 1 });
sessionSchema.index(...PURGE_INDEX);

const Session = mongoose.model('Session', sessionSchema);

export default Session;
