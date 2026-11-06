// Loads backend/.env into process.env. It must be the first import so app.js already sees the values.
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

const REQUIRED_ENV = [
  'MONGODB_URI',
  'CLIENT_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'MAILTRAP_USER',
  'MAILTRAP_PASS',
];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}. Copy backend/.env.example to backend/.env.`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
