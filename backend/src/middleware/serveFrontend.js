import fs from 'node:fs';
import path from 'node:path';
import express from 'express';

// In production the API also serves the built React app (frontend/dist), so the site and the API share one address
// and the session cookies (SameSite) keep working. Returns the middleware, or null if the app has not been built.
//   /assets/*      Vite's files have a content hash in their names, so browsers may keep them for a year.
//   other files    favicon etc.: checked again each time.
//   app pages      /internships?category=design, /profile ... (no file extension): index.html, never cached, so a
//                  new deploy is picked up at once. /api/* and missing files are left to the JSON "not found" answer.
export function serveFrontend(distDir) {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) return null;

  const files = express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      const hashed = filePath.includes(`${path.sep}assets${path.sep}`);
      res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  function appPage(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    if (path.extname(req.path) !== '') return next(); // e.g. an old /assets/index-1234.js after a new deploy
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  }

  return [files, appPage];
}
