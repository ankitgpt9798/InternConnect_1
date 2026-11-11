// Loads backend/.env into process.env. It must be the first import so app.js already sees the values.
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import AuthThrottle from './models/AuthThrottle.js';
import Device from './models/Device.js';
import LoginActivity from './models/LoginActivity.js';
import LoginChallenge from './models/LoginChallenge.js';
import Session from './models/Session.js';
import { describeEmail, emailConfigProblems } from './utils/emailConfig.js';
import { loadGeoIp } from './utils/geoip.js';
import { sessionTestMinutes, windowTestMode } from './utils/mobileLoginWindow.js';
import { testOverrideActive } from './utils/paymentWindow.js';
import { startSecuritySweeper } from './utils/securitySweeper.js';

const isProduction = process.env.NODE_ENV === 'production';

const REQUIRED_ENV = [
  'MONGODB_URI',
  'CLIENT_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  // Behind Render's proxy every request seems to come from the proxy unless it is trusted; the sign-in limits and
  // the new-IP checks (Module 6) need the student's real address.
  ...(isProduction ? ['TRUST_PROXY'] : []),
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  const where = isProduction ? 'Set them in the Render dashboard (Environment).' : 'Copy backend/.env.example to backend/.env.';
  console.error(`Missing environment variables: ${missing.join(', ')}. ${where}`);
  process.exit(1);
}

// Emails (sign-in codes, new passwords, invoices) go to the Mailtrap sandbox, locally and in the Render demo.
const emailProblems = emailConfigProblems();
if (emailProblems.length > 0) {
  console.error(emailProblems.join(' '));
  process.exit(1);
}

// Session cookies are "Secure" in production, so the site must be served over HTTPS.
if (isProduction && !process.env.CLIENT_URL.startsWith('https://')) {
  console.warn('CLIENT_URL should be the https:// address of the site in production (session cookies are sent over HTTPS only).');
}

// This project uses Razorpay Test Mode only, so live keys are refused.
if (!process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_')) {
  console.error('RAZORPAY_KEY_ID must be a Razorpay Test Mode key (it starts with "rzp_test_").');
  process.exit(1);
}

if (testOverrideActive()) {
  console.warn('PAYMENT_WINDOW_TEST_OPEN=true: plan payments are allowed at any time (local testing only).');
}
if (windowTestMode()) {
  console.warn(`MOBILE_LOGIN_WINDOW_TEST=${windowTestMode()}: the phone and tablet sign-in window is forced ${windowTestMode()} (local testing only).`);
}
if (sessionTestMinutes()) {
  console.warn(`MOBILE_SESSION_TEST_MINUTES=${sessionTestMinutes()}: phone and tablet sessions end after ${sessionTestMinutes()} minutes (local testing only).`);
}
if (process.env.TRUST_PROXY === 'true') {
  console.warn('TRUST_PROXY=true would let anyone fake their IP address, so only a local proxy is trusted. Set the number of proxies instead, e.g. 1.');
}

const PORT = process.env.PORT || 5000;

await connectDB();
// The sign-in limits and token lookups rely on unique indexes, so they must exist before the first request.
await Promise.all([AuthThrottle.init(), Device.init(), LoginActivity.init(), LoginChallenge.init(), Session.init()]);

const geo = await loadGeoIp();
if (!geo.loaded) {
  console.warn(`GeoLite2 database not found at ${geo.path}: sign-in locations will show as "Unknown" (see README, Module 6).`);
}
startSecuritySweeper();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${isProduction ? 'production' : process.env.NODE_ENV || 'development'}; email: ${describeEmail()})`);
});
