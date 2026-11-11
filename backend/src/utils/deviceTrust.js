import Device from '../models/Device.js';
import { DAY_MS } from '../models/securityFields.js';
import { sameBinding } from './clientInfo.js';
import { hashToken, newToken } from './tokens.js';

// Module 6 trusted devices. A device becomes trusted only after a correct email code, for 30 days.
export const TRUST_DAYS = 30;
const PURGE_AFTER_DAYS = 90;

export async function findDevice(userId, token) {
  if (!userId || typeof token !== 'string' || !token) return null;
  return Device.findOne({ user: userId, tokenHash: hashToken(token), revokedAt: null });
}

// 'new' (no record for this browser), 'mismatch' (its cookie came from another browser, system or kind of device),
// 'trusted' (verified with an email code in the last 30 days) or 'untrusted'.
export function deviceStateOf(device, binding, at) {
  if (!device) return 'new';
  if (!sameBinding(device.binding, binding)) return 'mismatch';
  return device.trustedAt && device.trustExpiresAt > at ? 'trusted' : 'untrusted';
}

export const isTrustedDevice = (device, at) => Boolean(device && !device.revokedAt && device.trustedAt && device.trustExpiresAt > at);

// After a successful sign-in: updates (or creates) this browser's record with a NEW token, so a copied device cookie
// stops working at the next sign-in. `trust` is true only after a correct email code (it then lasts 30 more days).
export async function saveDevice({ userId, device, client, location, trust, at, dbSession }) {
  const token = newToken();
  const fields = {
    tokenHash: hashToken(token),
    browser: client.browser,
    os: client.os,
    deviceClass: client.deviceClass,
    model: client.model,
    lastSeenAt: at,
    lastIp: client.ip,
    lastLocation: location,
    purgeAt: new Date(at.getTime() + PURGE_AFTER_DAYS * DAY_MS),
  };
  if (trust) Object.assign(fields, { trustedAt: at, trustExpiresAt: new Date(at.getTime() + TRUST_DAYS * DAY_MS) });

  if (device) {
    const updated = await Device.findOneAndUpdate(
      { _id: device._id, user: userId, revokedAt: null },
      { $set: fields },
      { returnDocument: 'after', session: dbSession },
    );
    if (updated) return { device: updated, token };
  }
  const [created] = await Device.create([{ user: userId, binding: client.binding, firstSeenAt: at, ...fields }], { session: dbSession });
  return { device: created, token };
}

export async function revokeDevice(deviceId, reason, at) {
  const result = await Device.updateOne({ _id: deviceId, revokedAt: null }, { $set: { revokedAt: at, revokedReason: reason } });
  return result.modifiedCount;
}
