// Loads backend/.env into process.env. It must be the first import so app.js already sees the values.
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import AuthThrottle from './models/AuthThrottle.js';
import Device from './models/Device.js';
import LoginActivity from './models/LoginActivity.js';
import LoginChallenge from './models/LoginChallenge.js';
import Session from './models/Session.js';
import { loadGeoIp } from './utils/geoip.js';
import { sessionTestMinutes, windowTestMode } from './utils/mobileLoginWindow.js';
import { testOverrideActive } from './utils/paymentWindow.js';
import { startSecuritySweeper } from './utils/securitySweeper.js';

const REQUIRED_ENV = [
  'MONGODB_URI',
  'CLIENT_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'MAILTRAP_USER',
  'MAILTRAP_PASS',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env.`);
  process.exit(1);
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
  console.log(`Server running on http://localhost:${PORT}`);
});
