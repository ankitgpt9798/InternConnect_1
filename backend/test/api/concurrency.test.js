import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import LoginChallenge from '../../src/models/LoginChallenge.js';
import Session from '../../src/models/Session.js';
import { Browser, browsers } from '../helpers/browser.js';
import { advance, codeFromBrowser, emailsTo, ist, latestCode, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

async function registered() {
  const student = newStudent();
  const result = await browsers.chrome(server.base, '198.51.100.1').register(student);
  return { student, userId: result.data.user.id };
}

// A copy of a browser with the same cookies (two tabs, or a request sent twice).
const twin = (browser) => {
  const copy = new Browser(browser.base, { userAgent: browser.userAgent, headers: browser.headers, ip: browser.ip });
  copy.jar = new Map(browser.jar);
  return copy;
};

describe('simultaneous and duplicate requests', () => {
  it('a double-click on "Log in" sends one email', async () => {
    const { student } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.70');
    const before = emailsTo(student.email).length;
    const results = await Promise.all([edge.login(student), edge.login(student)]);
    assert.deepEqual(results.map((r) => r.status), [202, 202]);
    assert.equal(emailsTo(student.email).length, before + 1);
    assert.equal((await edge.verifyLatestCode(student.email)).status, 200);
  });

  it('ten logins at once from one browser still send one email', async () => {
    const { student } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.71');
    const before = emailsTo(student.email).length;
    const results = await Promise.all(Array.from({ length: 10 }, () => edge.login(student)));
    assert.ok(results.every((r) => r.status === 202), JSON.stringify(results.map((r) => [r.status, r.data.code])));
    assert.equal(emailsTo(student.email).length, before + 1);
  });

  it('two devices signing in at the same time both get their own code and both finish', async () => {
    const { student, userId } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.72');
    const firefox = browsers.firefox(server.base, '203.0.113.73');
    const started = await Promise.all([edge.login(student), firefox.login(student)]);
    assert.deepEqual(started.map((r) => r.status), [202, 202]);
    const edgeCode = codeFromBrowser(student.email, 'Microsoft Edge');
    const firefoxCode = codeFromBrowser(student.email, 'Firefox');
    assert.notEqual(edgeCode, firefoxCode);
    const verified = await Promise.all([
      edge.post('/api/auth/login/verify', { otp: edgeCode }),
      firefox.post('/api/auth/login/verify', { otp: firefoxCode }),
    ]);
    assert.deepEqual(verified.map((r) => r.status), [200, 200]);
    assert.equal(await Session.countDocuments({ user: userId, revokedAt: null }), 3); // Chrome + Edge + Firefox
  });

  it('the same correct code sent five times at once creates exactly one session', async () => {
    const { student, userId } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.74');
    assert.equal((await edge.login(student)).status, 202);
    const code = latestCode(student.email);
    const tabs = Array.from({ length: 5 }, () => twin(edge));
    const results = await Promise.all(tabs.map((tab) => tab.post('/api/auth/login/verify', { otp: code })));
    assert.ok(results.every((r) => r.status === 200), JSON.stringify(results.map((r) => r.status)));
    assert.equal(await Session.countDocuments({ user: userId, createdVia: 'email_otp', ip: edge.ip }), 1);
    const withCookie = tabs.filter((tab) => tab.cookie('token'));
    assert.ok(withCookie.length >= 1);
    for (const tab of withCookie) assert.equal((await tab.get('/api/auth/me')).status, 200);
  });

  it('several "Send a new code" clicks at once send one email', async () => {
    const { student } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.75');
    assert.equal((await edge.login(student)).status, 202);
    advance(61_000);
    const before = emailsTo(student.email).length;
    const results = await Promise.all(Array.from({ length: 5 }, () => twin(edge).post('/api/auth/login/resend')));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(emailsTo(student.email).length, before + 1);
    const challenge = await LoginChallenge.findOne({ 'client.ip': edge.ip, status: 'pending' }).lean();
    assert.equal(challenge.resendCount, 1);
  });

  it('a correct code sent again after the answer was lost signs the browser in to the same session', async () => {
    const { student, userId } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.76');
    assert.equal((await edge.login(student)).status, 202);
    const code = latestCode(student.email);
    const lost = twin(edge); // this copy keeps the challenge cookie but never receives the answer
    assert.equal((await edge.post('/api/auth/login/verify', { otp: code })).status, 200);
    advance(5000);
    const retried = await lost.post('/api/auth/login/verify', { otp: code });
    assert.equal(retried.status, 200);
    assert.ok(lost.cookie('token'));
    assert.equal((await lost.get('/api/auth/me')).status, 200);
    assert.equal(await Session.countDocuments({ user: userId, ip: edge.ip }), 1);

    advance(3 * 60_000);
    assert.equal((await twin(lost).post('/api/auth/login/verify', { otp: code })).status, 401, 'not after 2 minutes');
  });

  // Found during the real-browser checks: a fresh window of the same browser on the same network was told to wait.
  it('a second window of the same browser can sign in right after another window finished its sign-in', async () => {
    const student = newStudent();
    const first = browsers.edge(server.base, '203.0.113.79');
    await first.register(student); // its code step is finished (verified)
    const second = browsers.edge(server.base, '203.0.113.79'); // same browser and network, no cookies yet
    const before = emailsTo(student.email).length;
    const started = await second.login(student);
    assert.equal(started.status, 202, JSON.stringify(started.data));
    assert.equal(emailsTo(student.email).length, before + 1);
    assert.equal((await second.verifyLatestCode(student.email)).status, 200);
  });

  it('"Use a different account" and then logging in again straight away sends a new code', async () => {
    const { student } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.80');
    assert.equal((await edge.login(student)).status, 202);
    const firstCode = latestCode(student.email);
    await edge.post('/api/auth/login/cancel');
    const again = await edge.login(student);
    assert.equal(again.status, 202, JSON.stringify(again.data));
    assert.notEqual(latestCode(student.email), firstCode);
    assert.equal((await edge.verifyLatestCode(student.email)).status, 200);
  });

  it('a window that started a sign-in 10 seconds ago does not block another window', async () => {
    const { student } = await registered();
    const first = browsers.edge(server.base, '203.0.113.81');
    assert.equal((await first.login(student)).status, 202);
    advance(10_000);
    const second = browsers.edge(server.base, '203.0.113.81');
    const before = emailsTo(student.email).length;
    assert.equal((await second.login(student)).status, 202);
    assert.equal(emailsTo(student.email).length, before + 1, 'its own code');
    assert.equal((await second.verifyLatestCode(student.email)).status, 200);
  });

  it('the same window logging in again (with its sign-in cookie) gets the code already sent', async () => {
    const { student } = await registered();
    const edge = browsers.edge(server.base, '203.0.113.82');
    const first = await edge.login(student);
    advance(20_000);
    const before = emailsTo(student.email).length;
    const again = await edge.login(student);
    assert.equal(again.status, 202);
    assert.equal(again.data.codeExpiresAt, first.data.codeExpiresAt, 'the same code');
    assert.equal(emailsTo(student.email).length, before, 'no second email');
    assert.equal((await edge.verifyLatestCode(student.email)).status, 200);
  });

  it('two registrations with the same details at once create one account', async () => {
    const student = newStudent();
    const results = await Promise.all([browsers.edge(server.base, '203.0.113.77').post('/api/auth/register', student), browsers.firefox(server.base, '203.0.113.78').post('/api/auth/register', student)]);
    assert.deepEqual(results.map((r) => r.status).sort(), [202, 409]);
  });
});
