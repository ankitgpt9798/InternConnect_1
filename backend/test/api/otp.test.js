import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import LoginActivity from '../../src/models/LoginActivity.js';
import LoginChallenge from '../../src/models/LoginChallenge.js';
import { hashToken } from '../../src/utils/tokens.js';
import { browsers } from '../helpers/browser.js';
import { advance, emailControl, emailsTo, ist, latestCode, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

// A student registered with Chrome; `browser` (Edge by default) is a new device, so its login needs a code.
async function pendingLogin(ip = '203.0.113.50') {
  const student = newStudent();
  await browsers.chrome(server.base, '198.51.100.1').register(student);
  const browser = browsers.edge(server.base, ip);
  const started = await browser.login(student);
  assert.equal(started.status, 202);
  return { student, browser, started };
}

const wrongCode = (code) => String((Number(code) + 1) % 1e6).padStart(6, '0');

describe('email codes', () => {
  it('five wrong codes lock the sign-in, and the right code then no longer works', async () => {
    const { student, browser } = await pendingLogin();
    const code = latestCode(student.email);
    for (let left = 4; left >= 1; left -= 1) {
      const wrong = await browser.post('/api/auth/login/verify', { otp: wrongCode(code) });
      assert.equal(wrong.status, 400);
      assert.equal(wrong.data.attemptsLeft, left);
    }
    const locked = await browser.post('/api/auth/login/verify', { otp: wrongCode(code) });
    assert.equal(locked.status, 429);
    assert.equal(locked.data.code, 'OTP_LOCKED');
    assert.notEqual((await browser.post('/api/auth/login/verify', { otp: code })).status, 200);
    const row = await LoginActivity.findOne({ ip: browser.ip, reason: 'otp_locked' });
    assert.ok(row);
  });

  it('a code expires after 10 minutes; a new one can be sent', async () => {
    const { student, browser } = await pendingLogin();
    const first = latestCode(student.email);
    advance(10 * 60_000);
    const expired = await browser.post('/api/auth/login/verify', { otp: first });
    assert.equal(expired.status, 410);
    assert.equal(expired.data.code, 'OTP_EXPIRED');
    assert.equal((await browser.post('/api/auth/login/resend')).status, 200);
    assert.notEqual(latestCode(student.email), first);
    assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
  });

  it('a new code needs 60 seconds, and at most 3 new codes per sign-in', async () => {
    const { student, browser } = await pendingLogin();
    const tooSoon = await browser.post('/api/auth/login/resend');
    assert.equal(tooSoon.status, 429);
    assert.equal(tooSoon.data.code, 'OTP_RESEND_COOLDOWN');
    for (let resend = 1; resend <= 3; resend += 1) {
      advance(61_000);
      const sent = await browser.post('/api/auth/login/resend');
      assert.equal(sent.status, 200);
      assert.equal(sent.data.resendsLeft, 3 - resend);
    }
    advance(61_000);
    const limit = await browser.post('/api/auth/login/resend');
    assert.equal(limit.status, 429);
    assert.equal(limit.data.code, 'OTP_RESEND_LIMIT');
    assert.equal(emailsTo(student.email).length, 5); // registration + 1 + 3
  });

  it('at most 6 codes per account in any hour', async () => {
    setTime(ist(9, 0));
    const student = newStudent();
    await browsers.chrome(server.base, '198.51.100.2').register(student);
    setTime(ist(11, 0));
    for (let n = 1; n <= 6; n += 1) {
      assert.equal((await browsers.edge(server.base, `203.0.113.${100 + n}`).login(student)).status, 202, `code ${n}`);
    }
    const seventh = await browsers.edge(server.base, '203.0.113.120').login(student);
    assert.equal(seventh.status, 429);
    assert.equal(seventh.data.code, 'OTP_HOURLY_LIMIT');
    assert.ok(seventh.data.retryAfterSeconds > 0);
    advance(61 * 60_000);
    assert.equal((await browsers.edge(server.base, '203.0.113.121').login(student)).status, 202);
  });

  it('a code works only in the browser that typed the password', async () => {
    const { student, browser } = await pendingLogin();
    const other = browsers.edge(server.base, '203.0.113.99');
    const stolen = await other.post('/api/auth/login/verify', { otp: latestCode(student.email) });
    assert.equal(stolen.status, 401);
    assert.equal(stolen.data.code, 'NO_CHALLENGE');
    assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
  });

  it('codes and tokens are never stored in plain text', async () => {
    const { student, browser } = await pendingLogin();
    const code = latestCode(student.email);
    const challengeToken = browser.cookie('ic_signin');
    const challenge = await LoginChallenge.findOne({ tokenHash: hashToken(challengeToken) }).lean();
    assert.match(challenge.codeHash, /^\$2[aby]\$/);
    assert.equal((await browser.verifyLatestCode(student.email)).status, 200);

    const deviceTokens = browser.cookieNames().filter((name) => name.startsWith('icd_')).map((name) => browser.cookie(name));
    assert.equal(deviceTokens.length, 1);
    const secrets = [code, challengeToken, browser.cookie('token'), ...deviceTokens];
    for (const name of ['loginchallenges', 'loginactivities', 'sessions', 'devices', 'auththrottles', 'otps']) {
      const docs = await mongoose.connection.db.collection(name).find({}).toArray();
      const dump = JSON.stringify(docs);
      for (const secret of secrets) assert.equal(dump.includes(secret), false, `${name} contains a secret`);
    }
    const used = await LoginChallenge.findById(challenge._id).lean();
    assert.equal(used.codeHash, undefined, 'the code hash is removed once used');
  });

  it('an email that cannot be sent does not count: the student can try again at once', async () => {
    const student = newStudent();
    await browsers.chrome(server.base, '198.51.100.3').register(student);
    const browser = browsers.edge(server.base, '203.0.113.60');
    emailControl.failNext = 1;
    const failed = await browser.login(student);
    assert.equal(failed.status, 502);
    assert.equal(failed.data.code, 'OTP_DELIVERY_FAILED');
    assert.equal((await browser.login(student)).status, 202);
    assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
    assert.ok(await LoginActivity.findOne({ ip: browser.ip, reason: 'otp_delivery_failed' }));
  });

  it('a new code that cannot be sent keeps the previous code working', async () => {
    const { student, browser } = await pendingLogin();
    const first = latestCode(student.email);
    advance(61_000);
    emailControl.failNext = 1;
    assert.equal((await browser.post('/api/auth/login/resend')).status, 502);
    assert.equal((await browser.post('/api/auth/login/verify', { otp: first })).status, 200);
  });

  it('"Use a different account" cancels the sign-in', async () => {
    const { student, browser } = await pendingLogin();
    const code = latestCode(student.email);
    assert.equal((await browser.post('/api/auth/login/cancel')).status, 200);
    assert.equal((await browser.post('/api/auth/login/verify', { otp: code })).status, 401);
    assert.ok(await LoginActivity.findOne({ ip: browser.ip, reason: 'otp_cancelled' }));
  });

  it('a sign-in must be finished within 30 minutes', async () => {
    const { student, browser } = await pendingLogin();
    advance(31 * 60_000);
    const late = await browser.verifyLatestCode(student.email);
    assert.equal(late.status, 410);
    assert.equal(late.data.code, 'CHALLENGE_EXPIRED');
  });

  it('a newer sign-in in the same browser replaces the older code', async () => {
    const { student, browser } = await pendingLogin();
    const older = latestCode(student.email);
    advance(61_000);
    assert.equal((await browser.login(student)).status, 202);
    const newer = latestCode(student.email);
    assert.notEqual(newer, older);
    assert.equal((await browser.post('/api/auth/login/verify', { otp: older })).status, 400);
    assert.equal((await browser.post('/api/auth/login/verify', { otp: newer })).status, 200);
    assert.ok(await LoginChallenge.findOne({ status: 'superseded', 'client.ip': browser.ip }));
  });

  it('rejects codes that are not 6 digits without counting them', async () => {
    const { student, browser } = await pendingLogin();
    assert.equal((await browser.post('/api/auth/login/verify', { otp: '12ab' })).status, 400);
    assert.equal((await browser.post('/api/auth/login/verify', { otp: { $gt: '' } })).status, 400);
    assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
  });
});
