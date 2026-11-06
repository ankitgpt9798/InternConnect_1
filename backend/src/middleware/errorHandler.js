// Any request that did not match a route.
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express sends every thrown error here (Express 5 also catches errors from async handlers).
// Express recognises an error handler by its four arguments, so `next` must stay even though it is unused.
export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error(err);

  res.status(status).json({
    message: status >= 500 ? 'Something went wrong on the server.' : err.message,
  });
}
