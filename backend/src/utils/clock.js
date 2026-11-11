// The server's current time. Every login-security rule reads the time from here (never from the browser), so the
// automated tests can move the clock to check the 10:00 AM–1:00 PM IST window without waiting.
let testNow = null;

export const now = () => (testNow ? new Date(testNow()) : new Date());

// Tests only: setClockForTests(() => someDate) fixes the time; setClockForTests(null) brings back the real clock.
export function setClockForTests(fn) {
  testNow = fn;
}
