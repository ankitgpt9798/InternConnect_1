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
