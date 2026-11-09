import { now } from './clock.js';
import { istMinutesOfDay, startOfIstDay } from './istTime.js';

// Module 6 rule: phones and tablets may sign in only from 10:00 AM to 1:00 PM India Standard Time (server clock),
// and their sessions end at exactly 1:00 PM IST.
export const MOBILE_LOGIN_WINDOW = { start: '10:00', end: '13:00', timeZone: 'Asia/Kolkata' };
const OPENS_AT_MINUTE = 10 * 60;
const CLOSES_AT_MINUTE = 13 * 60; // closed from 13:00:00 on
const DAY_MS = 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === 'production';

// Local testing only (both are ignored when NODE_ENV=production):
// MOBILE_LOGIN_WINDOW_TEST=open|closed forces the window open or closed at any time of day, and
// MOBILE_SESSION_TEST_MINUTES=N ends phone and tablet sessions N minutes after they start, to see the 1 PM sign-out.
export function windowTestMode() {
  if (isProduction()) return null;
  const mode = process.env.MOBILE_LOGIN_WINDOW_TEST;
  return mode === 'open' || mode === 'closed' ? mode : null;
}

export function sessionTestMinutes() {
  if (isProduction()) return null;
  const minutes = Number(process.env.MOBILE_SESSION_TEST_MINUTES);
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 180 ? minutes : null;
}

export const isRestrictedDevice = (deviceClass) => deviceClass === 'mobile' || deviceClass === 'tablet';

const istTimeToday = (at, minute) => new Date(startOfIstDay(at).getTime() + minute * 60000);
const nextIstTime = (at, minute) => {
  const today = istTimeToday(at, minute);
  return today > at ? today : new Date(today.getTime() + DAY_MS);
};

// Whether a phone or tablet may sign in at `at`, and when the window next opens and closes.
export function mobileWindowStatus(at = now()) {
  const minute = istMinutesOfDay(at);
  const insideWindow = minute >= OPENS_AT_MINUTE && minute < CLOSES_AT_MINUTE;
  const testMode = windowTestMode();
  return {
    ...MOBILE_LOGIN_WINDOW,
    open: testMode ? testMode === 'open' : insideWindow,
    insideWindow,
    opensAt: nextIstTime(at, OPENS_AT_MINUTE),
    closesAt: nextIstTime(at, CLOSES_AT_MINUTE),
    testMode,
    serverTime: at,
  };
}

// When a phone or tablet session started at `createdAt` must end: 13:00:00 IST that day (the next 13:00 if the test
// override let it start after 1 PM).
export function mobileSessionExpiry(createdAt = now()) {
  let expiry = nextIstTime(createdAt, CLOSES_AT_MINUTE);
  const minutes = sessionTestMinutes();
  if (minutes) expiry = new Date(Math.min(expiry.getTime(), createdAt.getTime() + minutes * 60000));
  return expiry;
}
