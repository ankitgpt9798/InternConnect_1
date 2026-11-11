import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { errorHandler, notFound } from '../../src/middleware/errorHandler.js';
import { securityHeaders } from '../../src/middleware/securityHeaders.js';
import { serveFrontend } from '../../src/middleware/serveFrontend.js';

// Production serving of the built React app (Render): app pages get index.html, hashed assets are cached for a year,
// /api/* and missing files keep the JSON "not found" answer.
let server;
let base;
let dist;

before(async () => {
  dist = fs.mkdtempSync(path.join(os.tmpdir(), 'ic-dist-'));
  fs.mkdirSync(path.join(dist, 'assets'));
  fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'console.log(1);');
  fs.writeFileSync(path.join(dist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

  const app = express();
  app.use(securityHeaders);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use(serveFrontend(dist));
  app.use(notFound);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  fs.rmSync(dist, { recursive: true, force: true });
});

describe('serving the React app in production', () => {
  it('app pages (also with filters) get index.html, never cached', async () => {
    for (const page of ['/', '/internships?category=design', '/profile', '/internships/6650a1b2c3d4e5f6a7b8c9d0']) {
      const res = await fetch(base + page);
      assert.equal(res.status, 200, page);
      assert.match(res.headers.get('content-type'), /text\/html/, page);
      assert.equal(res.headers.get('cache-control'), 'no-cache', page);
      assert.match(await res.text(), /id="root"/, page);
    }
  });

  it('hashed assets are cached for a year; other files are checked again', async () => {
    const asset = await fetch(`${base}/assets/index-abc123.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    const icon = await fetch(`${base}/favicon.svg`);
    assert.equal(icon.status, 200);
    assert.equal(icon.headers.get('cache-control'), 'no-cache');
  });

  it('the API, unknown API addresses, missing files and other methods are not answered with the page', async () => {
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
    const unknownApi = await fetch(`${base}/api/nothing-here`);
    assert.equal(unknownApi.status, 404);
    assert.match((await unknownApi.json()).message, /Route not found/);
    const oldAsset = await fetch(`${base}/assets/index-old999.js`);
    assert.equal(oldAsset.status, 404);
    assert.match(oldAsset.headers.get('content-type'), /application\/json/);
    const post = await fetch(`${base}/internships`, { method: 'POST' });
    assert.equal(post.status, 404);
  });

  it('every answer has the security headers', async () => {
    for (const url of ['/', '/api/health', '/api/nothing-here']) {
      const res = await fetch(base + url);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff', url);
      assert.equal(res.headers.get('x-frame-options'), 'DENY', url);
      assert.equal(res.headers.get('content-security-policy'), "frame-ancestors 'none'", url);
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', url);
    }
  });

  it('without a build there is nothing to serve', () => {
    assert.equal(serveFrontend(path.join(dist, 'missing')), null);
  });
});
