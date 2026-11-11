import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import LoginActivity from '../../src/models/LoginActivity.js';
import Session from '../../src/models/Session.js';
import { UA } from '../fixtures/userAgents.js';
import { Browser, browsers } from '../helpers/browser.js';
import { emailsTo, ist, latestCode, newStudent, outbox, setTime, startTestServer } from '../helpers/testServer.js';

let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0))); // inside the phone window unless a test moves the clock

describe('Google Chrome', () => {
  it('Chrome desktop needs an email code on every login, even once trusted', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    const chrome = browsers.chrome(server.base);

    for (let round = 0; round < 2; round += 1) {
      const started = await chrome.login(student);
      assert.equal(started.status, 202);
      assert.equal(started.data.code, 'OTP_REQUIRED');
      assert.ok(started.data.reasons.includes('chrome'));
      assert.equal(chrome.cookie('token'), null, 'no session before the code');
      const verified = await chrome.verifyLatestCode(student.email);
      assert.equal(verified.status, 200);
      assert.ok(chrome.cookie('token'));
      await chrome.post('/api/auth/logout');
    }
  });

  it('Chrome on a phone needs the time window AND the code', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    const phone = browsers.chromeAndroid(server.base);

    const started = await phone.login(student);
    assert.equal(started.status, 202);
    assert.ok(started.data.reasons.includes('chrome'));
    assert.equal((await phone.verifyLatestCode(student.email)).status, 200);

    setTime(ist(14, 0));
    const before = outbox.length;
    const refused = await phone.login(student);
    assert.equal(refused.status, 403);
    assert.equal(refused.data.code, 'MOBILE_LOGIN_WINDOW');
    assert.equal(outbox.length, before, 'no code is sent outside the window');
  });
});

describe('Edge, Firefox and other browsers', () => {
  for (const name of ['edge', 'firefox', 'safariMac']) {
    it(`${name}: a code on a new device, then the password alone on the trusted device`, async () => {
      const student = newStudent();
      await browsers.chrome(server.base).register(student);
      const browser = browsers[name](server.base);

      const first = await browser.login(student);
      assert.equal(first.status, 202);
      assert.deepEqual(first.data.reasons, ['new_device']);
      assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
      await browser.post('/api/auth/logout');

      const second = await browser.login(student);
      assert.equal(second.status, 200);
      assert.ok(browser.cookie('token'));
    });
  }
});

describe('phones and tablets: 10:00 AM to 1:00 PM IST', () => {
  const restricted = ['chromeAndroid', 'edgeAndroid', 'chromeTablet', 'safariIphone'];
  for (const name of restricted) {
    it(`${name} is refused outside the window, before the password is checked`, async () => {
      const student = newStudent();
      await browsers.edge(server.base).register(student);
      for (const time of [ist(9, 59, 59), ist(13, 0, 0), ist(20, 0)]) {
        setTime(time);
        const wrongPassword = await browsers[name](server.base).login({ ...student, password: 'wrong-password' });
        assert.equal(wrongPassword.status, 403, 'refused the same way with a wrong password: no password oracle');
        assert.equal(wrongPassword.data.code, 'MOBILE_LOGIN_WINDOW');
        assert.ok(wrongPassword.data.opensAt);
      }
    });
  }

  it('an iPad showing desktop sites (Mac User-Agent + touch hint) is treated as a tablet', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    setTime(ist(15, 0));
    const ipad = new Browser(server.base, { userAgent: UA.safariMac });
    assert.equal((await ipad.login(student, { touchMac: true })).status, 403);
    assert.equal((await ipad.login(student)).status, 202, 'the same User-Agent without the hint is a computer');
  });

  it('the window is checked again when the code is entered', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    setTime(ist(12, 58));
    const phone = browsers.edgeAndroid(server.base);
    assert.equal((await phone.login(student)).status, 202);
    setTime(ist(13, 0, 1));
    const late = await phone.verifyLatestCode(student.email);
    assert.equal(late.status, 403);
    assert.equal(late.data.code, 'MOBILE_LOGIN_WINDOW');
    assert.equal(phone.cookie('token'), null);
    const row = await LoginActivity.findOne({ ip: phone.ip, reason: 'window_closed_at_verify' });
    assert.ok(row);
  });

  it('desktop browsers have no time window', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    await edge.post('/api/auth/logout');
    setTime(ist(23, 30));
    assert.equal((await edge.login(student)).status, 200);
  });
});

describe('registration', () => {
  for (const name of ['chrome', 'edge', 'firefox']) {
    it(`${name}: a new account gets a session only after the email code`, async () => {
      const student = newStudent();
      const browser = browsers[name](server.base);
      const started = await browser.post('/api/auth/register', student);
      assert.equal(started.status, 202);
      assert.ok(started.data.reasons.includes('new_account'));
      assert.equal(browser.cookie('token'), null);
      assert.equal((await browser.get('/api/auth/me')).status, 401);
      assert.equal((await browser.verifyLatestCode(student.email)).status, 200);
      const me = await browser.get('/api/auth/me');
      assert.equal(me.status, 200);
      assert.equal(me.data.user.email, student.email);
    });
  }

  it('a phone outside the window creates the account but no session', async () => {
    setTime(ist(16, 0));
    const student = newStudent();
    const phone = browsers.chromeAndroid(server.base);
    const created = await phone.post('/api/auth/register', student);
    assert.equal(created.status, 201);
    assert.equal(created.data.code, 'ACCOUNT_CREATED_NO_SESSION');
    assert.equal(phone.cookie('token'), null);
    assert.equal(emailsTo(student.email).length, 0);
    assert.equal(await Session.countDocuments({ user: created.data.user.id }), 0);

    // It can sign in later inside the window (with a code).
    setTime(ist(10, 30, 0, 16));
    assert.equal((await phone.login(student)).status, 202);
  });

  it('duplicates are refused with codes the app can translate', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    const again = await browsers.edge(server.base).post('/api/auth/register', student);
    assert.equal(again.status, 409);
    assert.deepEqual(again.data.errorCodes, { email: 'EMAIL_TAKEN', phone: 'PHONE_TAKEN' });
  });
});

describe('wrong details', () => {
  it('an unknown account and a wrong password get the same answer', async () => {
    const student = newStudent();
    await browsers.edge(server.base).register(student);
    const wrong = await browsers.edge(server.base).login({ ...student, password: 'not-the-password' });
    const unknown = await browsers.edge(server.base).login({ ...newStudent(), password: 'not-the-password' });
    assert.equal(wrong.status, 401);
    assert.deepEqual(wrong.data, unknown.data);
    assert.equal(latestCode(student.email) !== null, true); // only the registration code was ever sent
  });
});
