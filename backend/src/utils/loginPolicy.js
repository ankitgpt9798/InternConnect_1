// Module 6 sign-in policy and risk assessment. A pure function (no database), so every rule is easy to test.
//
// It runs only AFTER a correct password (phones and tablets outside 10:00 AM–1:00 PM IST are refused before that).
//   R1  Google Chrome                                      -> email code, every time, even on a trusted device
//   R2  new, untrusted or mismatched device (any browser)  -> email code
//   R3  trusted device, many recent failures from other IPs -> email code
//   R4  trusted device, new IP in a new country            -> email code
//   R5  trusted device, new IP in a known country          -> allowed, "new sign-in" alert email
//   R6  trusted device, known IP                           -> allowed
// A new registration always needs the code (the account has no trusted device yet). A new IP address alone never
// refuses a sign-in.
export function assessSignIn({ purpose = 'login', isChrome, deviceState, ipSeen, locationKnown, countrySeen, browserSeen, recentFailures }) {
  const newCountry = Boolean(locationKnown && !countrySeen);

  const signals = [];
  if (!ipSeen) signals.push('new_ip');
  if (newCountry) signals.push('new_country');
  if (!browserSeen) signals.push('new_browser');
  if (deviceState === 'new' || deviceState === 'mismatch') signals.push('new_device');
  if (recentFailures) signals.push('recent_failures');

  const otpReasons = [];
  if (purpose === 'register') otpReasons.push('new_account');
  if (isChrome) otpReasons.push('chrome');
  if (purpose !== 'register') {
    if (deviceState === 'new') otpReasons.push('new_device');
    else if (deviceState === 'untrusted') otpReasons.push('untrusted_device');
    else if (deviceState === 'mismatch') otpReasons.push('device_mismatch');
    else {
      if (recentFailures) otpReasons.push('recent_failures');
      if (!ipSeen && newCountry) otpReasons.push('new_country');
    }
  }

  const level = recentFailures || (!ipSeen && newCountry) ? 'high' : !ipSeen ? 'medium' : 'low';
  const requireOtp = otpReasons.length > 0;
  return { requireOtp, otpReasons, risk: { level, signals }, sendNewIpAlert: !requireOtp && !ipSeen };
}
