import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import applicationRoutes from './routes/applicationRoutes.js';
import authRoutes from './routes/authRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import internshipRoutes from './routes/internshipRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import postRoutes from './routes/postRoutes.js';
import resumeRoutes from './routes/resumeRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { parseTrustProxy } from './utils/ip.js';

const app = express();

// Which proxies may say where a request came from (X-Forwarded-For), so req.ip is the student's real address.
// Default "loopback" (the Vite dev server); set TRUST_PROXY to the number of proxies in production.
app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Allow the React app to call the API and send cookies.
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser()); // fills req.cookies

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/resumes', resumeRoutes);

// Must come after all routes.
app.use(notFound);
app.use(errorHandler);

export default app;
