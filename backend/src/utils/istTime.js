// Daily limits restart at midnight India Standard Time, using the server's clock (never the browser's).
// India has no daylight saving time, so IST is always UTC+05:30.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The moment the current Indian calendar day began (00:00 IST).
export function startOfIstDay(date = new Date()) {
  const indianTime = new Date(date.getTime() + IST_OFFSET_MS); // the same moment, written as Indian clock time
  indianTime.setUTCHours(0, 0, 0, 0); // back to midnight on that Indian date
  return new Date(indianTime.getTime() - IST_OFFSET_MS);
}

// The next midnight IST, when the daily limit restarts.
export const startOfNextIstDay = (date = new Date()) => new Date(startOfIstDay(date).getTime() + DAY_MS);

// The Indian calendar date as "YYYYMMDD", e.g. for invoice numbers.
export const istDateKey = (date = new Date()) => new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10).replaceAll('-', '');

// Date and time as shown in India, e.g. "7 Nov 2026, 10:15 am".
export const formatIst = (date) =>
  date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Minutes since midnight on the Indian clock (0-1439), e.g. 10:30 AM IST -> 630.
export const istMinutesOfDay = (date = new Date()) => Math.floor((date.getTime() - startOfIstDay(date).getTime()) / 60000);

// Midnight IST on the 1st of the Indian calendar month of `date` (monthsAhead = 1 gives the next month).
export function startOfIstMonth(date = new Date(), monthsAhead = 0) {
  const indianTime = new Date(date.getTime() + IST_OFFSET_MS);
  const firstOfMonth = Date.UTC(indianTime.getUTCFullYear(), indianTime.getUTCMonth() + monthsAhead, 1);
  return new Date(firstOfMonth - IST_OFFSET_MS);
}
