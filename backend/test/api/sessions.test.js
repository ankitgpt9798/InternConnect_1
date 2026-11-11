import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import Device from '../../src/models/Device.js';
import LoginChallenge from '../../src/models/LoginChallenge.js';
import Session from '../../src/models/Session.js';
import { sweepExpired } from '../../src/utils/securitySweeper.js';
import { UA } from '../fixtures/userAgents.js';
import { Browser, browsers } from '../helpers/browser.js';
import { advance, codeFromBrowser, ist, latestCode, newStudent, outbox, setTime, startTestServer } from '../helpers/testServer.js';

let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

const withToken = (base, token, { userAgent = UA.edgeWindows, ip = '203.0.113.10' } = {}) => {
  const browser = new Browser(base, { userAgent, ip });
  browser.jar.set('token', { value: token, path: '/' });
  return browser;
};

// Signs the student in on a second browser (new device: needs the code from the email that names this browser).
async function signInOn(browser, student, browserName) {
  assert.equal((await browser.login(student)).status, 202);
  assert.equal((await browser.post('/api/auth/login/verify', { otp: codeFromBrowser(student.email, browserName) })).status, 200);
}

describe('session lifetime', () => {
  it('logout ends the session on the server, not only the cookie', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const token = edge.cookie('token');
    await edge.post('/api/auth/logout');
    const replay = await withToken(server.base, token).get('/api/auth/me');
    assert.equal(replay.status, 401);
    assert.equal(replay.data.code, 'SESSION_REVOKED');
  });

  // Found in the real-clock T4 check: the cookie used to expire at the same moment as the session, so at 1:00 PM the
  // browser sent no cookie, the server could only say "not logged in" and the app did not show the 1 PM message.
  it('the browser keeps the session cookie 5 minutes past the session end, so it can be told why it ended', async () => {
    setTime(ist(12, 40));
    const phone = browsers.edgeAndroid(server.base);
    await phone.register(newStudent());
    assert.equal(Number(phone.jar.get('token').attrs['max-age']), 20 * 60 + 5 * 60, 'phone: until 13:00 IST + 5 minutes');
    setTime(ist(13, 2));
    const ended = await phone.get('/api/auth/me');
    assert.equal(ended.status, 401);
    assert.equal(ended.data.code, 'MOBILE_SESSION_ENDED', 'still sent after 1 PM, refused with the reason');

    setTime(ist(11, 0));
    const edge = browsers.edge(server.base);
    await edge.register(newStudent());
    assert.equal(Number(edge.jar.get('token').attrs['max-age']), 7 * 24 * 3600 + 5 * 60, 'computer: 7 days + 5 minutes');
  });

  it('computer sessions last 7 days', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const me = await edge.get('/api/auth/me');
    assert.equal(new Date(me.data.session.expiresAt).getTime(), ist(11, 0).getTime() + 7 * 24 * 3600_000);
    advance(7 * 24 * 3600_000);
    assert.equal((await edge.get('/api/auth/me')).data.code, 'SESSION_EXPIRED');
  });

  it('phone and tablet sessions end at exactly 1:00 PM IST, even after the token was replaced', async () => {
    setTime(ist(12, 40));
    const student = newStudent();
    const phone = browsers.edgeAndroid(server.base);
    await phone.register(student);
    const me = await phone.get('/api/auth/me');
    assert.equal(me.data.session.deviceClass, 'mobile');
    assert.equal(new Date(me.data.session.expiresAt).getTime(), ist(13, 0).getTime());

    setTime(ist(12, 56)); // 16 minutes later: the token is replaced, the end time is not
    const before = phone.cookie('token');
    assert.equal((await phone.get('/api/auth/me')).status, 200);
    assert.notEqual(phone.cookie('token'), before);

    setTime(ist(12, 59, 59));
    assert.equal((await phone.get('/api/auth/me')).status, 200);
    setTime(ist(13, 0, 0));
    const ended = await phone.get('/api/auth/me');
    assert.equal(ended.status, 401);
    assert.equal(ended.data.code, 'MOBILE_SESSION_ENDED');
    // The old token (within its 60 seconds) does not work either.
    assert.equal((await withToken(server.base, before, { userAgent: UA.edgeAndroid }).get('/api/auth/me')).status, 401);

    await sweepExpired(ist(13, 0, 0));
    const record = await Session.findOne({ user: me.data.user.id }).lean();
    assert.equal(record.revokedReason, 'mobile_window_ended');
    assert.equal(record.revokedAt.getTime(), ist(13, 0).getTime());
  });
});

describe('token rotation', () => {
  it('replaces the token every 15 minutes; the old one works for 60 seconds, then using it ends the session', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const first = edge.cookie('token');

    advance(16 * 60_000);
    assert.equal((await edge.get('/api/auth/me')).status, 200);
    const second = edge.cookie('token');
    assert.notEqual(second, first);
    assert.equal((await withToken(server.base, first).get('/api/auth/me')).status, 200, 'old token inside the grace period');

    advance(2 * 60_000);
    assert.equal((await edge.get('/api/auth/me')).status, 200, 'the browser uses its new token');
    const reuse = await withToken(server.base, first).get('/api/auth/me');
    assert.equal(reuse.status, 401);
    assert.equal(reuse.data.code, 'SESSION_REVOKED');
    assert.equal((await edge.get('/api/auth/me')).status, 401, 'a copied token ends the whole session');
  });

  it('recovers when the answer with the new token was lost (same network)', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const first = edge.cookie('token');
    advance(16 * 60_000);
    assert.equal((await withToken(server.base, first).get('/api/auth/me')).status, 200); // its new cookie is "lost"
    advance(2 * 60_000);
    const retry = withToken(server.base, first);
    const recovered = await retry.get('/api/auth/me');
    assert.equal(recovered.status, 200);
    assert.notEqual(retry.cookie('token'), first);
    assert.equal((await retry.get('/api/auth/me')).status, 200);
  });

  it('does not recover for a different network (treated as a copied token)', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const first = edge.cookie('token');
    advance(16 * 60_000);
    await withToken(server.base, first).get('/api/auth/me');
    advance(2 * 60_000);
    assert.equal((await withToken(server.base, first, { ip: '192.0.2.77' }).get('/api/auth/me')).status, 401);
  });

  it('parallel requests at rotation time all succeed and leave one valid token', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    advance(16 * 60_000);
    const results = await Promise.all(Array.from({ length: 8 }, () => edge.get('/api/auth/me')));
    assert.ok(results.every((result) => result.status === 200));
    advance(2 * 60_000);
    assert.equal((await edge.get('/api/auth/me')).status, 200);
  });
});

describe('a session belongs to one browser and device', () => {
  it('its cookie used by another browser ends the session', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const copied = await withToken(server.base, edge.cookie('token'), { userAgent: UA.chromeWindows }).get('/api/auth/me');
    assert.equal(copied.status, 401);
    assert.equal(copied.data.code, 'SESSION_CONTEXT_CHANGED');
    assert.equal((await edge.get('/api/auth/me')).status, 401);
  });

  it('a phone switched to "Desktop site" is signed out', async () => {
    const student = newStudent();
    const phone = browsers.chromeAndroid(server.base);
    await phone.register(student);
    phone.userAgent = UA.chromeLinux;
    assert.equal((await phone.get('/api/auth/me')).data.code, 'SESSION_CONTEXT_CHANGED');
  });

  it('a browser update keeps the session', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    edge.userAgent = UA.edgeWindows.replaceAll('131', '132');
    assert.equal((await edge.get('/api/auth/me')).status, 200);
  });

  it('refuses cookies from before Module 6', async () => {
    const old = withToken(server.base, 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyJ9.signature');
    const result = await old.get('/api/auth/me');
    assert.equal(result.status, 401);
    assert.equal(result.data.code, 'SESSION_EXPIRED');
    assert.equal(old.cookie('token'), null, 'the old cookie is cleared');
  });
});

describe('signing out other devices', () => {
  it('lists the sessions and signs one out (password needed)', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const firefox = browsers.firefox(server.base, '203.0.113.11');
    await signInOn(firefox, student, 'Firefox');

    const list = await edge.get('/api/users/me/sessions');
    assert.equal(list.data.sessions.length, 2);
    assert.equal(list.data.sessions.filter((session) => session.current).length, 1);
    const other = list.data.sessions.find((session) => !session.current);
    assert.equal(other.browser.name, 'Firefox');

    const noPassword = await edge.post(`/api/users/me/sessions/${other.id}/revoke`, {});
    assert.equal(noPassword.data.code, 'PASSWORD_REQUIRED');
    const wrong = await edge.post(`/api/users/me/sessions/${other.id}/revoke`, { password: 'nope-nope' });
    assert.equal(wrong.status, 403);
    assert.equal(wrong.data.code, 'PASSWORD_INCORRECT');
    assert.equal((await edge.post(`/api/users/me/sessions/${other.id}/revoke`, { password: student.password })).status, 200);

    const kicked = await firefox.get('/api/auth/me');
    assert.equal(kicked.status, 401);
    assert.equal(kicked.data.code, 'SESSION_REVOKED');
    assert.equal((await edge.get('/api/auth/me')).status, 200);
  });

  it('"Sign out all other devices" keeps only this one', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    await edge.register(student);
    const firefox = browsers.firefox(server.base, '203.0.113.12');
    const safari = browsers.safariMac(server.base, '203.0.113.13');
    await signInOn(firefox, student, 'Firefox');
    await signInOn(safari, student, 'Safari');

    const result = await edge.post('/api/users/me/sessions/revoke-others', { password: student.password });
    assert.equal(result.data.revokedCount, 2);
    assert.equal((await firefox.get('/api/auth/me')).status, 401);
    assert.equal((await safari.get('/api/auth/me')).status, 401);
    assert.equal((await edge.get('/api/auth/me')).status, 200);
  });

  it("another student's sessions cannot be seen or ended", async () => {
    const owner = newStudent();
    const ownerEdge = browsers.edge(server.base);
    await ownerEdge.register(owner);
    const ownerSessionId = (await ownerEdge.get('/api/users/me/sessions')).data.sessions[0].id;

    const intruder = newStudent();
    const intruderEdge = browsers.edge(server.base, '203.0.113.14');
    await intruderEdge.register(intruder);
    const theirList = await intruderEdge.get('/api/users/me/sessions');
    assert.ok(theirList.data.sessions.every((session) => session.id !== ownerSessionId));
    const attempt = await intruderEdge.post(`/api/users/me/sessions/${ownerSessionId}/revoke`, { password: intruder.password });
    assert.equal(attempt.status, 404);
    assert.equal((await ownerEdge.get('/api/auth/me')).status, 200);
  });
});

describe('password reset', () => {
  it('ends every session, removes trusted devices and cancels unfinished sign-ins', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    const userId = (await edge.register(student)).data.user.id;
    const firefox = browsers.firefox(server.base, '203.0.113.15');
    await signInOn(firefox, student, 'Firefox');
    await firefox.post('/api/auth/logout');
    const chrome = browsers.chrome(server.base, '203.0.113.16');
    assert.equal((await chrome.login(student)).status, 202); // waiting for its code
    const chromeCode = latestCode(student.email);

    const guest = browsers.edge(server.base, '203.0.113.17');
    assert.equal((await guest.post('/api/auth/forgot-password', { identifier: student.email })).status, 200);
    const resetCode = [...outbox].reverse().find((m) => m.to === student.email).text.match(/reset code is (\d{6})/)[1];
    const reset = await guest.post('/api/auth/reset-password', { identifier: student.email, otp: resetCode });
    assert.equal(reset.status, 200);
    assert.equal(reset.data.signedOutEverywhere, true);

    const kicked = await edge.get('/api/auth/me');
    assert.equal(kicked.status, 401);
    assert.equal(kicked.data.code, 'SESSION_REVOKED');
    assert.equal((await chrome.post('/api/auth/login/verify', { otp: chromeCode })).status, 401, 'the old-password sign-in is cancelled');
    assert.ok((await Device.countDocuments({ user: userId })) >= 2, 'the devices are still recorded…');
    assert.equal(await Device.countDocuments({ user: userId, revokedAt: null }), 0, '…but none is trusted any more');
    assert.equal(await Session.countDocuments({ user: userId, revokedAt: null }), 0);
    assert.ok(await LoginChallenge.findOne({ status: 'cancelled', 'client.ip': chrome.ip }));

    // The previously trusted Edge needs a code again, with the new password.
    const again = await edge.login({ ...student, password: reset.data.password });
    assert.equal(again.status, 202);
    assert.deepEqual(again.data.reasons, ['new_device']);
  });
});
