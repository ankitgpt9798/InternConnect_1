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
import postRoutes from './routes/postRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();

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

// Must come after all routes.
app.use(notFound);
app.use(errorHandler);

export default app;
