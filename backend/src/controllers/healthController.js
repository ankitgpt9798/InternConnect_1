import mongoose from 'mongoose';

const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

// GET /api/health - shows that the API is running and whether MongoDB is connected.
export function getHealth(req, res) {
  const database = DB_STATES[mongoose.connection.readyState] ?? 'unknown';
  const ok = database === 'connected';

  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'error',
    database,
    time: new Date().toISOString(),
  });
}
