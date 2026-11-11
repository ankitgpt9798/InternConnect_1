import { now } from '../utils/clock.js';

// Fields shared by the Module 6 models (sign-in history, codes, sessions, devices).

export const DEVICE_CLASSES = ['desktop', 'mobile', 'tablet', 'unknown'];

// Why a sign-in needed an email code.
export const OTP_REASONS = ['chrome', 'new_device', 'untrusted_device', 'device_mismatch', 'new_country', 'recent_failures', 'new_account'];

export const browserField = { name: { type: String, default: 'Unknown' }, version: { type: String, default: '' } };
export const osField = { name: { type: String, default: 'Unknown' }, version: { type: String, default: '' } };

// The browser name, system and kind of device a session or device record is tied to.
export const bindingField = {
  browserName: { type: String, required: true },
  osName: { type: String, required: true },
  deviceClass: { type: String, enum: DEVICE_CLASSES, required: true },
};

// Approximate only: city, region and country from the offline GeoLite2 database (never coordinates).
export const locationField = {
  kind: { type: String, enum: ['approximate', 'local', 'unknown'], default: 'unknown' },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  country: { type: String, default: '' },
  countryCode: { type: String, default: '' },
};

// createdAt/updatedAt follow the same clock as the security rules (so tests can move time).
export const timestamps = { currentTime: () => now() };

// Records are deleted by MongoDB itself once `purgeAt` has passed (retention).
export const purgeField = { type: Date, required: true };
export const PURGE_INDEX = [{ purgeAt: 1 }, { expireAfterSeconds: 0 }];

export const DAY_MS = 24 * 60 * 60 * 1000;
export const LOG_RETENTION_DAYS = 90;
