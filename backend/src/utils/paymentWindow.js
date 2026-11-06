import { istMinutesOfDay, startOfIstDay } from './istTime.js';

// Assignment rule: plan payments can be started only from 5:00 AM to 11:45 AM India Standard Time (server clock).
export const PAYMENT_WINDOW = { start: '05:00', end: '11:45', timeZone: 'Asia/Kolkata' };
const OPENS_AT_MINUTE = 5 * 60; // 05:00
const CLOSES_AT_MINUTE = 11 * 60 + 45; // 11:45 (the window is closed from 11:45:00 on)

// For local testing outside the window: PAYMENT_WINDOW_TEST_OPEN=true in backend/.env.
// It is ignored when NODE_ENV=production, so the real rule always applies there.
export const testOverrideActive = () => process.env.PAYMENT_WINDOW_TEST_OPEN === 'true' && process.env.NODE_ENV !== 'production';

// Whether a plan payment may be started at `now`, and when the window opens next if it is closed.
export function paymentWindowStatus(now = new Date()) {
  const minute = istMinutesOfDay(now);
  const insideWindow = minute >= OPENS_AT_MINUTE && minute < CLOSES_AT_MINUTE;
  const open = insideWindow || testOverrideActive();

  let opensAt = null;
  if (!open) {
    opensAt = new Date(startOfIstDay(now).getTime() + OPENS_AT_MINUTE * 60000); // 05:00 today
    if (opensAt <= now) opensAt = new Date(opensAt.getTime() + 24 * 60 * 60 * 1000); // or 05:00 tomorrow
  }
  return { ...PAYMENT_WINDOW, open, opensAt, testOverride: !insideWindow && open, serverTime: now };
}
