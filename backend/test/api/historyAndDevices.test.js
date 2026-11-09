import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { setGeoReaderForTests } from '../../src/utils/geoip.js';
import { browsers } from '../helpers/browser.js';
import { advance, codeFromBrowser, ist, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

let server;
before(async () => {
  server = await startTestServer();
  setGeoReaderForTests({
    get: (ip) =>
      ip.startsWith('203.0.113.')
        ? { city: { names: { en: 'Pune' } }, subdivisions: [{ names: { en: 'Maharashtra' } }], country: { iso_code: 'IN', names: { en: 'India' } } }
        : null,
  });
});
after(async () => {
  setGeoReaderForTests(null);
  await server.stop();
});
beforeEach(() => setTime(ist(11, 0)));

describe('login history', () => {
  it('records browser, system, device, model, IP, approximate location, time and result, newest first', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.80');
    await edge.register(student);
    await edge.login({ ...student, password: 'wrong-password' }); // a failure
    advance(60_000);
    const phone = browsers.chromeAndroid(server.base, '203.0.113.81');
    assert.equal((await phone.login(student, { model: 'Pixel 8', platformVersion: '14.0.0', mobile: true })).status, 202);
    assert.equal((await phone.post('/api/auth/login/verify', { otp: codeFromBrowser(student.email, 'Chrome') })).status, 200);

    const history = await phone.get('/api/users/me/login-history');
    assert.equal(history.status, 200);
    const [latest, failure, registration] = history.data.items;
    assert.equal(history.data.items.length, 3);
    assert.ok(new Date(latest.createdAt) > new Date(failure.createdAt));

    assert.equal(latest.status, 'success');
    assert.equal(latest.verification, 'email_otp');
    assert.deepEqual(latest.otpReasons, ['chrome', 'new_device']);
    assert.deepEqual(latest.otp, { codesSent: 1, codesEntered: 1 });
    assert.equal(latest.browser.name, 'Chrome');
    assert.equal(latest.browser.version, '131.0.0.0');
    assert.equal(latest.os.name, 'Android');
    assert.equal(latest.deviceClass, 'mobile');
    assert.equal(latest.model, 'Pixel 8');
    assert.equal(latest.ip, '203.0.113.81');
    assert.deepEqual(latest.location, { kind: 'approximate', city: 'Pune', region: 'Maharashtra', country: 'India', countryCode: 'IN' });
    assert.equal(latest.currentSession, true);
    assert.deepEqual(latest.flags, { newDevice: true, newBrowser: true, newIp: true });

    assert.equal(failure.status, 'failed');
    assert.equal(failure.reason, 'wrong_password');
    assert.equal(registration.event, 'register');
    assert.equal(registration.currentSession, false);
    assert.equal('userAgent' in latest, false, 'the raw User-Agent is not sent');
  });

  it('pages with a cursor', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.82');
    await edge.register(student);
    for (let n = 0; n < 4; n += 1) await browsers.firefox(server.base, `198.51.100.${n + 1}`).login({ ...student, password: 'wrong-password' });
    const first = await edge.get('/api/users/me/login-history?limit=2');
    assert.equal(first.data.items.length, 2);
    const second = await edge.get(`/api/users/me/login-history?limit=2&before=${first.data.nextCursor}`);
    const third = await edge.get(`/api/users/me/login-history?limit=2&before=${second.data.nextCursor}`);
    assert.equal(third.data.items.length, 1);
    assert.equal(third.data.nextCursor, null);
    const ids = [...first.data.items, ...second.data.items, ...third.data.items].map((item) => item.id);
    assert.equal(new Set(ids).size, 5);
    assert.equal((await edge.get('/api/users/me/login-history?before=not-an-id')).status, 400);
  });

  it('shows only your own attempts (never other students or unknown accounts)', async () => {
    const mine = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.83');
    await edge.register(mine);
    const other = newStudent();
    await browsers.edge(server.base, '203.0.113.84').register(other);
    await browsers.firefox(server.base, '203.0.113.85').login({ ...newStudent(), password: 'whatever1' }); // unknown account
    const history = await edge.get('/api/users/me/login-history?limit=50');
    assert.equal(history.data.items.length, 1);
    assert.ok(history.data.items.every((item) => item.ip === '203.0.113.83'));
  });

  it('a code nobody entered shows as expired', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.86');
    await edge.register(student);
    assert.equal((await browsers.firefox(server.base, '203.0.113.87').login(student)).status, 202);
    advance(31 * 60_000);
    const [pending] = (await edge.get('/api/users/me/login-history')).data.items;
    assert.equal(pending.status, 'failed');
    assert.equal(pending.reason, 'otp_expired');
  });
});

describe('devices', () => {
  it('lists devices with their trust, and removing one ends its sessions', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.88');
    await edge.register(student);
    const firefox = browsers.firefox(server.base, '203.0.113.89');
    assert.equal((await firefox.login(student)).status, 202);
    assert.equal((await firefox.post('/api/auth/login/verify', { otp: codeFromBrowser(student.email, 'Firefox') })).status, 200);

    const list = await edge.get('/api/users/me/devices');
    assert.equal(list.data.devices.length, 2);
    assert.ok(list.data.devices.every((device) => device.trusted));
    const firefoxDevice = list.data.devices.find((device) => device.browser.name === 'Firefox');
    assert.equal(new Date(firefoxDevice.trustExpiresAt).getTime() - new Date(firefoxDevice.trustedAt).getTime(), 30 * 24 * 3600_000);

    assert.equal((await edge.post(`/api/users/me/devices/${firefoxDevice.id}/remove`, { password: 'wrong-password' })).status, 403);
    const removed = await edge.post(`/api/users/me/devices/${firefoxDevice.id}/remove`, { password: student.password });
    assert.equal(removed.data.sessionsEnded, 1);
    assert.equal((await firefox.get('/api/auth/me')).status, 401);
    const again = await firefox.login(student);
    assert.equal(again.status, 202);
    assert.deepEqual(again.data.reasons, ['new_device']);
  });

  it('trust ends after 30 days: the device needs a code again', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.90');
    await edge.register(student);
    await edge.post('/api/auth/logout');
    advance(29 * 24 * 3600_000);
    assert.equal((await edge.login(student)).status, 200);
    await edge.post('/api/auth/logout');
    advance(2 * 24 * 3600_000);
    const expired = await edge.login(student);
    assert.equal(expired.status, 202);
    assert.deepEqual(expired.data.reasons, ['untrusted_device']);
  });

  it('a device cookie copied to another browser is not accepted', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.91');
    await edge.register(student);
    await edge.post('/api/auth/logout');
    const firefox = browsers.firefox(server.base, '203.0.113.91');
    for (const name of edge.cookieNames().filter((cookie) => cookie.startsWith('icd_'))) firefox.jar.set(name, edge.jar.get(name));
    const copied = await firefox.login(student);
    assert.equal(copied.status, 202);
    assert.deepEqual(copied.data.reasons, ['device_mismatch']);
  });
});
