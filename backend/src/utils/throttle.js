import { randomUUID } from 'node:crypto';
import AuthThrottle from '../models/AuthThrottle.js';
import { now } from './clock.js';

// Module 6 sign-in limits. Every check-and-count is one atomic MongoDB update, so parallel requests cannot slip past.
// There is never an account-wide lock: limits apply to one account FROM ONE IP address, or to one IP address, so
// someone guessing passwords can only slow down their own address, never lock the real student out.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const PENDING_TTL_MS = 30_000; // a password check still running (forgotten after 30 s if the server stopped mid-request)
const BUSY_MS = 2000; // the limit is full only because of checks still running: others wait for them
const BUSY_WAIT_MS = 3000; // ...for at most this long

export const ACCOUNT_IP_LIMIT = { windowMs: 15 * MINUTE, threshold: 5 }; // 5th failure: 1 min, then 2, 4, 8, 15 (cap)
export const IP_LIMIT = { windowMs: 15 * MINUTE, threshold: 20 }; // 20 failures: 5 min, 30: 15 min, 40+: 60 min
export const OTP_CODES_PER_HOUR = 6;

// The cooldowns in plain JavaScript (used by the tests and to document the rule).
export const accountIpCooldownMs = (failures) => (failures < 5 ? 0 : Math.min(15 * MINUTE, MINUTE * 2 ** (failures - 5)));
export const ipCooldownMs = (failures) => (failures < 20 ? 0 : failures >= 40 ? 60 * MINUTE : failures >= 30 ? 15 * MINUTE : 5 * MINUTE);

// ...and as MongoDB expressions, so the cooldown starts in the same update that records the failure.
const accountIpCooldown = (count) => ({ $min: [15 * MINUTE, { $multiply: [MINUTE, { $pow: [2, { $subtract: [count, 5] }] }] }] });
const ipCooldown = (count) => ({
  $switch: {
    branches: [
      { case: { $gte: [count, 40] }, then: 60 * MINUTE },
      { case: { $gte: [count, 30] }, then: 15 * MINUTE },
    ],
    default: 5 * MINUTE,
  },
});

const LIMITS = {
  account_ip: { ...ACCOUNT_IP_LIMIT, cooldown: accountIpCooldown },
  ip: { ...IP_LIMIT, cooldown: ipCooldown },
};

const isDuplicateKey = (error) => error?.code === 11000;
const since = (at, ms) => new Date(at.getTime() - ms);
const later = (at, ms) => new Date(at.getTime() + ms);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newEntry = (at) => ({ id: randomUUID(), at });

// MongoDB expressions over the entry lists ({ id, at }).
const list = (field) => ({ $ifNull: [`$${field}`, []] });
const recent = (field, after) => ({ $filter: { input: list(field), cond: { $gt: ['$$this.at', after] } } });
const without = (field, id) => ({ $filter: { input: list(field), cond: { $ne: ['$$this.id', id] } } });
const size = (field) => ({ $size: list(field) });

// Takes a slot for one password check unless the key is blocked. `hits` are confirmed failures in the window and
// `pending` are checks still running; when together they reach the limit, the key is briefly "busy".
async function takeSlot(key, limit, at) {
  const entry = newEntry(at);
  const pipeline = [
    { $set: { hits: recent('hits', since(at, limit.windowMs)), pending: { $concatArrays: [recent('pending', since(at, PENDING_TTL_MS)), [entry]] } } },
    {
      $set: {
        blockedUntil: { $cond: [{ $gte: [{ $add: [size('hits'), size('pending')] }, limit.threshold] }, later(at, BUSY_MS), null] },
        expiresAt: later(at, limit.windowMs + HOUR),
      },
    },
  ];
  for (let tryNumber = 0; tryNumber < 3; tryNumber += 1) {
    try {
      await AuthThrottle.findOneAndUpdate({ key, $or: [{ blockedUntil: null }, { blockedUntil: { $lte: at } }] }, pipeline, {
        upsert: true,
        updatePipeline: true,
      });
      return { ok: true, key, limit, entry };
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      // The record exists but is blocked (or two first attempts created it at the same moment: try again).
      const existing = await AuthThrottle.findOne({ key }).lean();
      if (existing?.blockedUntil && existing.blockedUntil > at) {
        const failures = (existing.hits ?? []).filter((hit) => hit.at > since(at, limit.windowMs)).length;
        return { ok: false, busy: failures < limit.threshold, retryAfterMs: existing.blockedUntil.getTime() - at.getTime() };
      }
    }
  }
  return { ok: false, busy: true, retryAfterMs: 1000 };
}

// Ends a password check: a failure is recorded (and may start a cooldown); otherwise the slot is simply given back.
async function settle({ key, limit, entry }, failed) {
  const at = now();
  const saturated = { $gte: [{ $add: [size('hits'), size('pending')] }, limit.threshold] };
  const otherwise = { $cond: [saturated, '$blockedUntil', null] };
  await AuthThrottle.updateOne(
    { key },
    [
      {
        $set: {
          pending: without('pending', entry.id),
          hits: failed ? { $concatArrays: [recent('hits', since(at, limit.windowMs)), [entry]] } : recent('hits', since(at, limit.windowMs)),
        },
      },
      {
        $set: {
          blockedUntil: failed
            ? { $cond: [{ $gte: [size('hits'), limit.threshold] }, { $add: [at, limit.cooldown(size('hits'))] }, otherwise] }
            : { $cond: [{ $gte: [size('hits'), limit.threshold] }, '$blockedUntil', otherwise] },
          expiresAt: later(at, limit.windowMs + HOUR),
        },
      },
    ],
    { upsert: failed, updatePipeline: true },
  );
}

// Before a password is checked. Returns { ok: false, scope, busy, retryAfterMs } during a cooldown, or
// { ok: true, succeeded, failed }: call failed() for a wrong password and succeeded() for a right one (the account+IP
// count then starts again). A browser with a trusted device cookie for the account skips the per-IP limit, so students
// sharing a college or mobile-carrier address are not slowed down by someone else's failures.
export async function reserveLoginAttempt({ userId, ip, skipIpLimit = false, at = now() }) {
  const wanted = [];
  if (!skipIpLimit) wanted.push({ key: `ip:${ip}`, scope: 'ip' });
  if (userId) wanted.push({ key: `acct_ip:${userId}:${ip}`, scope: 'account_ip' });

  const startedAt = Date.now();
  for (;;) {
    const taken = [];
    let refused = null;
    for (const { key, scope } of wanted) {
      const slot = await takeSlot(key, LIMITS[scope], at);
      if (!slot.ok) {
        refused = { ...slot, scope };
        break;
      }
      taken.push(slot);
    }
    if (!refused) {
      return {
        ok: true,
        failed: () => Promise.all(taken.map((slot) => settle(slot, true))),
        succeeded: () => Promise.all(taken.map((slot) => (slot.key.startsWith('acct_ip:') ? AuthThrottle.deleteOne({ key: slot.key }) : settle(slot, false)))),
      };
    }
    await Promise.all(taken.map((slot) => settle(slot, false))); // a refused attempt does not count anywhere
    // Full only because other checks are still running (e.g. a double-click): wait for them instead of refusing.
    if (!refused.busy || Date.now() - startedAt > BUSY_WAIT_MS) return { ok: false, scope: refused.scope, busy: refused.busy, retryAfterMs: refused.retryAfterMs };
    await sleep(150);
    at = now();
  }
}

// At most `max` uses of `key` in any rolling `windowMs` (email codes, alert emails, new sign-in codes per browser).
// Returns { ok: true, release } or { ok: false, retryAfterMs }; release() gives the use back (e.g. when an email
// could not be sent). Counting and blocking happen in one atomic update.
export async function takeQuota(key, { windowMs, max }, at) {
  const entry = newEntry(at);
  const oldestCounted = { $let: { vars: { hit: { $arrayElemAt: ['$hits', -max] } }, in: '$$hit.at' } };
  const pipeline = [
    { $set: { hits: { $concatArrays: [recent('hits', since(at, windowMs)), [entry]] } } },
    {
      $set: {
        hits: { $slice: ['$hits', -60] },
        // Once `max` uses are in the window, blocked until the oldest of them leaves it.
        blockedUntil: { $cond: [{ $gte: [size('hits'), max] }, { $add: [oldestCounted, windowMs] }, null] },
        expiresAt: later(at, windowMs + HOUR),
      },
    },
  ];
  for (let tryNumber = 0; tryNumber < 3; tryNumber += 1) {
    try {
      await AuthThrottle.findOneAndUpdate({ key, $or: [{ blockedUntil: null }, { blockedUntil: { $lte: at } }] }, pipeline, {
        upsert: true,
        updatePipeline: true,
      });
      return { ok: true, release: () => releaseQuota(key, entry.id) };
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
      const existing = await AuthThrottle.findOne({ key }).lean();
      if (existing?.blockedUntil && existing.blockedUntil > at) return { ok: false, retryAfterMs: existing.blockedUntil.getTime() - at.getTime() };
    }
  }
  return { ok: false, retryAfterMs: 1000 };
}

async function releaseQuota(key, id) {
  await AuthThrottle.updateOne({ key }, [{ $set: { hits: without('hits', id), blockedUntil: null } }], { updatePipeline: true });
}
