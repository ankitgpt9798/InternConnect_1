import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// Allow the React app to call the API and send cookies.
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/health', healthRoutes);

// Must come after all routes.
app.use(notFound);
app.use(errorHandler);

export default app;
