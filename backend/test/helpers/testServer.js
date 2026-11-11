import { randomInt } from 'node:crypto';
import { once } from 'node:events';
import { mock } from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { setClockForTests } from '../../src/utils/clock.js';

// Starts the real Express app against an in-memory MongoDB replica set (transactions need a replica set).
// Emails are captured in `outbox` instead of being sent. Test files must not import modules that send email
// before calling startTestServer(), so the mock is in place first.

export const outbox = [];
export const emailControl = { failNext: 0 };

const SEND_EMAIL = new URL('../../src/utils/sendEmail.js', import.meta.url).href;

export async function startTestServer() {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    CLIENT_URL: 'http://localhost:5173',
    TRUST_PROXY: 'loopback', // the tests connect from 127.0.0.1, so X-Forwarded-For sets the client IP
    RAZORPAY_KEY_ID: 'rzp_test_dummy',
    RAZORPAY_KEY_SECRET: 'dummy',
    MAILTRAP_USER: 'test',
    MAILTRAP_PASS: 'test',
  });
  delete process.env.MOBILE_LOGIN_WINDOW_TEST;
  delete process.env.MOBILE_SESSION_TEST_MINUTES;

  const fakeEmail = {
    sendEmail: async (message) => {
      if (emailControl.failNext > 0) {
        emailControl.failNext -= 1;
        throw new Error('Simulated email failure');
      }
      outbox.push(message);
      return { messageId: String(outbox.length) };
    },
  };
  // Node 24 renamed the option from namedExports to exports.
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  mock.module(SEND_EMAIL, nodeMajor >= 24 ? { exports: fakeEmail } : { namedExports: fakeEmail });

  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const { default: app } = await import('../../src/app.js');
  for (const name of ['AuthThrottle', 'Device', 'LoginActivity', 'LoginChallenge', 'Session', 'User']) {
    const { default: model } = await import(`../../src/models/${name}.js`);
    await model.init();
  }

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    async stop() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await replSet.stop();
      setClockForTests(null);
    },
  };
}

// The test clock. Dates are in 2027 so MongoDB's own expiry (real clock) never removes test records mid-test.
let current = null;
export function setTime(date) {
  current = new Date(date);
  setClockForTests(() => current);
}
export function advance(ms) {
  setTime(current.getTime() + ms);
}
export const ist = (hours, minutes = 0, seconds = 0, day = 15) => new Date(Date.UTC(2027, 0, day, hours, minutes, seconds) - 330 * 60000);

export const latestCode = (email) => [...outbox].reverse().find((message) => message.to === email)?.text.match(/code is (\d{6})/)?.[1] ?? null;
export const emailsTo = (email) => outbox.filter((message) => message.to === email);
// The latest code sent to `email` for a sign-in from the browser named in the email (e.g. "Firefox").
export const codeFromBrowser = (email, browserName) =>
  [...outbox].reverse().find((message) => message.to === email && message.text.includes(`Browser: ${browserName}`))?.text.match(/code is (\d{6})/)?.[1] ?? null;

let counter = 0;
export function newStudent(overrides = {}) {
  counter += 1;
  const tag = `${process.pid}${counter}${randomInt(1000, 9999)}`;
  return {
    name: `Student ${counter}`,
    email: `student.${tag}@example.com`,
    phone: `9${String(randomInt(0, 1e9)).padStart(9, '0')}`,
    password: 'Password123',
    ...overrides,
  };
}
