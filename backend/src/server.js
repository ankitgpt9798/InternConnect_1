// Loads backend/.env into process.env. It must be the first import so app.js already sees the values.
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import { testOverrideActive } from './utils/paymentWindow.js';

const REQUIRED_ENV = [
  'MONGODB_URI',
  'CLIENT_URL',
  'JWT_SECRET',
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

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
