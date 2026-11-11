import mongoose from 'mongoose';
import { bindingField, browserField, DEVICE_CLASSES, locationField, osField, PURGE_INDEX, purgeField, timestamps } from './securityFields.js';

// Module 6: a browser this account has signed in from. The browser keeps a random token in an httpOnly cookie (one
// cookie per account); only its SHA-256 hash is stored, and it is replaced at every sign-in. A device is trusted only
// after a correct email code, for 30 days. A token presented by a different browser, system or kind of device is not
// accepted (the record is then revoked). Deleted 90 days after it was last used.
const deviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    binding: bindingField,
    browser: browserField,
    os: osField,
    deviceClass: { type: String, enum: DEVICE_CLASSES, default: 'unknown' }, // includes page hints (e.g. iPad = tablet)
    model: { type: String, default: '' },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    lastIp: { type: String, default: '' },
    lastLocation: locationField,
    trustedAt: { type: Date, default: null },
    trustExpiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, enum: ['user_removed', 'password_reset', 'mismatch'], default: null },
    purgeAt: purgeField,
  },
  { timestamps },
);

deviceSchema.index({ user: 1, revokedAt: 1, lastSeenAt: -1 });
deviceSchema.index(...PURGE_INDEX);

const Device = mongoose.model('Device', deviceSchema);

export default Device;
