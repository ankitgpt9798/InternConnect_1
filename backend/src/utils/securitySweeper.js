import LoginActivity from '../models/LoginActivity.js';
import LoginChallenge from '../models/LoginChallenge.js';
import Session from '../models/Session.js';
import { now } from './clock.js';
import { startOfIstDay } from './istTime.js';

// Module 6 housekeeping. Every request already refuses ended sessions by their expiry time; this also MARKS them as
// ended (so the history says why), exactly at 1:00 PM IST for phones and tablets and every minute otherwise, and
// closes sign-in codes nobody finished within 30 minutes.
export async function sweepExpired(at = now()) {
  await Session.updateMany(
    { revokedAt: null, expiresAt: { $lte: at } },
    [
      {
        $set: {
          revokedAt: '$expiresAt',
          revokedReason: { $cond: [{ $in: ['$deviceClass', ['mobile', 'tablet']] }, 'mobile_window_ended', 'expired'] },
        },
      },
    ],
    { updatePipeline: true },
  );

  const stale = await LoginChallenge.find({ status: 'pending', expiresAt: { $lte: at } }, { _id: 1, loginActivity: 1 }).lean();
  if (stale.length > 0) {
    await LoginChallenge.updateMany({ _id: { $in: stale.map((c) => c._id) }, status: 'pending' }, { $set: { status: 'expired' }, $unset: { codeHash: 1 } });
    await LoginActivity.updateMany(
      { _id: { $in: stale.map((c) => c.loginActivity) }, status: 'otp_pending' },
      { $set: { status: 'failed', reason: 'otp_expired', completedAt: at } },
    );
  }
}

const ONE_PM_IST_MINUTES = 13 * 60;

function msUntilNextOnePmIst(at = new Date()) {
  let next = new Date(startOfIstDay(at).getTime() + ONE_PM_IST_MINUTES * 60000);
  if (next <= at) next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
  return next.getTime() - at.getTime();
}

export function startSecuritySweeper() {
  const run = () => sweepExpired().catch((error) => console.error('Security sweep failed:', error.message));
  setInterval(run, 60_000).unref();
  const scheduleOnePm = () => {
    setTimeout(() => {
      run();
      scheduleOnePm();
    }, msUntilNextOnePmIst() + 50).unref();
  };
  scheduleOnePm();
}
