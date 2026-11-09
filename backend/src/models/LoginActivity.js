import mongoose from 'mongoose';
import { browserField, DEVICE_CLASSES, locationField, osField, OTP_REASONS, PURGE_INDEX, purgeField, timestamps } from './securityFields.js';

// Module 6: one record per sign-in attempt (login or registration), successful or not. This is the login history
// shown on the dashboard. Kept for 90 days.
export const LOGIN_STATUSES = ['success', 'failed', 'blocked', 'otp_pending', 'rate_limited'];
export const LOGIN_REASONS = [
  'wrong_password',
  'unknown_account',
  'outside_mobile_window',
  'cooldown_account_ip',
  'cooldown_ip',
  'otp_hourly_limit',
  'otp_expired',
  'otp_locked',
  'otp_delivery_failed',
  'otp_cancelled',
  'otp_superseded',
  'window_closed_at_verify',
];
export const RISK_SIGNALS = ['new_ip', 'new_country', 'new_browser', 'new_device', 'recent_failures'];

const loginActivitySchema = new mongoose.Schema(
  {
    // null when nobody has an account with the email or phone number typed. Those records are never shown to anyone;
    // they only count towards the per-IP limit. The typed text itself is not stored.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    event: { type: String, enum: ['login', 'register'], required: true },
    status: { type: String, enum: LOGIN_STATUSES, required: true },
    reason: { type: String, enum: LOGIN_REASONS, default: null },
    verification: { type: String, enum: ['none', 'email_otp'], default: 'none' },
    otpReasons: [{ type: String, enum: OTP_REASONS }],
    risk: {
      level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      signals: [{ type: String, enum: RISK_SIGNALS }],
    },
    // First time this account was used from this device / browser / IP address.
    flags: {
      newDevice: { type: Boolean, default: false },
      newBrowser: { type: Boolean, default: false },
      newIp: { type: Boolean, default: false },
    },
    browser: browserField,
    os: osField,
    deviceClass: { type: String, enum: DEVICE_CLASSES, default: 'unknown' },
    model: { type: String, default: '' },
    userAgent: { type: String, default: '', maxlength: 512 },
    ip: { type: String, default: '' },
    location: locationField,
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'LoginChallenge', default: null },
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
    device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },
    completedAt: { type: Date, default: null },
    purgeAt: purgeField,
  },
  { timestamps },
);

loginActivitySchema.index({ user: 1, _id: -1 }); // history, newest first
loginActivitySchema.index({ user: 1, status: 1, ip: 1 }); // "new IP?"
loginActivitySchema.index({ user: 1, status: 1, 'location.countryCode': 1 }); // "new country?"
loginActivitySchema.index({ user: 1, status: 1, createdAt: -1 }); // recent failures
loginActivitySchema.index(...PURGE_INDEX);

const LoginActivity = mongoose.model('LoginActivity', loginActivitySchema);

export default LoginActivity;
