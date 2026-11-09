import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import LoginActivity from '../../src/models/LoginActivity.js';
import { setGeoReaderForTests } from '../../src/utils/geoip.js';
import { browsers } from '../helpers/browser.js';
import { advance, emailsTo, ist, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

// Test addresses: 203.0.113.x = Mumbai (India), 198.51.100.x = Delhi (India), 192.0.2.x = Berlin (Germany).
const PLACES = {
  '203.0.113': { city: 'Mumbai', region: 'Maharashtra', country: 'India', code: 'IN' },
  '198.51.100': { city: 'Delhi', region: 'Delhi', country: 'India', code: 'IN' },
  '192.0.2': { city: 'Berlin', region: 'Berlin', country: 'Germany', code: 'DE' },
};

let server;
before(async () => {
  server = await startTestServer();
  setGeoReaderForTests({
    get(ip) {
      const place = PLACES[ip.split('.').slice(0, 3).join('.')];
      return place
        ? { city: { names: { en: place.city } }, subdivisions: [{ names: { en: place.region } }], country: { iso_code: place.code, names: { en: place.country } } }
        : null;
    },
  });
});
after(async () => {
  setGeoReaderForTests(null);
  await server.stop();
});
beforeEach(() => setTime(ist(11, 0)));

// A student whose Edge is trusted, signed out again, at `ip`.
async function trustedEdge(ip = '203.0.113.20') {
  const student = newStudent();
  const edge = browsers.edge(server.base, ip);
  await edge.register(student);
  await edge.post('/api/auth/logout');
  return { student, edge };
}

describe('risk assessment on a trusted device', () => {
  it('a new IP in a known country signs in, with one alert email', async () => {
    const { student, edge } = await trustedEdge();
    edge.ip = '198.51.100.30';
    assert.equal((await edge.login(student)).status, 200);
    const alerts = emailsTo(student.email).filter((message) => message.subject === 'New sign-in to your InternConnect account');
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].text, /Delhi, Delhi, India \(approximate\)/);
    await edge.post('/api/auth/logout');
    assert.equal((await edge.login(student)).status, 200);
    assert.equal(emailsTo(student.email).filter((message) => message.subject.startsWith('New sign-in')).length, 1, 'known IP now: no second alert');
  });

  it('a new IP in a new country needs an email code (a VPN abroad)', async () => {
    const { student, edge } = await trustedEdge();
    edge.ip = '192.0.2.40';
    const result = await edge.login(student);
    assert.equal(result.status, 202);
    assert.deepEqual(result.data.reasons, ['new_country']);
    const row = await LoginActivity.findOne({ ip: '192.0.2.40', status: 'otp_pending' }).lean();
    assert.equal(row.risk.level, 'high');
  });

  it('many failed attempts from other addresses need a code even on a trusted device', async () => {
    const { student, edge } = await trustedEdge('203.0.113.21');
    for (const ip of ['198.51.100.41', '198.51.100.42', '198.51.100.43']) {
      for (let n = 0; n < 4; n += 1) await browsers.firefox(server.base, ip).login({ ...student, password: 'wrong-password' });
    }
    const result = await edge.login(student);
    assert.equal(result.status, 202);
    assert.deepEqual(result.data.reasons, ['recent_failures']);
  });

  it('IP changes (VPN on and off, Wi-Fi and mobile data) never refuse a sign-in', async () => {
    const { student, edge } = await trustedEdge('203.0.113.22');
    for (const ip of ['203.0.113.23', '198.51.100.24', '203.0.113.22', '192.0.2.25', '10.0.0.5']) {
      edge.ip = ip;
      const result = await edge.login(student);
      assert.ok([200, 202].includes(result.status), `${ip}: ${result.status}`);
      if (result.status === 202) await edge.post('/api/auth/login/cancel');
      else await edge.post('/api/auth/logout');
    }
  });

  it('records first-time devices, browsers and IP addresses', async () => {
    const { student } = await trustedEdge('203.0.113.26');
    const chrome = browsers.chrome(server.base, '198.51.100.27');
    assert.equal((await chrome.login(student)).status, 202);
    const row = await LoginActivity.findOne({ ip: '198.51.100.27' }).lean();
    assert.deepEqual(row.flags, { newDevice: true, newBrowser: true, newIp: true });
    assert.deepEqual(row.otpReasons, ['chrome', 'new_device']);
    assert.equal(row.location.city, 'Delhi');
    assert.equal(row.location.kind, 'approximate');
  });
});

describe('repeated failures: progressive cooldowns without lockouts', () => {
  it('one account from one IP: 1 minute after 5 failures, then 2, then 4', async () => {
    const { student } = await trustedEdge('203.0.113.30');
    const attacker = browsers.firefox(server.base, '198.51.100.50');
    const wrong = { ...student, password: 'wrong-password' };
    for (let n = 1; n <= 5; n += 1) assert.equal((await attacker.login(wrong)).status, 401, `failure ${n}`);

    for (const minutes of [1, 2, 4]) {
      const cooling = await attacker.login(student); // even the right password waits
      assert.equal(cooling.status, 429);
      assert.equal(cooling.data.code, 'LOGIN_COOLDOWN');
      assert.equal(cooling.data.retryAfterSeconds, minutes * 60);
      advance(minutes * 60_000 + 1000);
      assert.equal((await attacker.login(wrong)).status, 401);
    }
  });

  it('waiting attempts do not make the cooldown longer', async () => {
    const { student } = await trustedEdge('203.0.113.31');
    const attacker = browsers.firefox(server.base, '198.51.100.51');
    for (let n = 0; n < 5; n += 1) await attacker.login({ ...student, password: 'wrong-password' });
    const first = (await attacker.login(student)).data.retryAfterSeconds;
    advance(20_000);
    for (let n = 0; n < 3; n += 1) await attacker.login(student);
    assert.equal((await attacker.login(student)).data.retryAfterSeconds, first - 20);
  });

  it('the real student is not locked out: another network still signs in', async () => {
    const { student, edge } = await trustedEdge('203.0.113.32');
    const attacker = browsers.firefox(server.base, '198.51.100.52');
    for (let n = 0; n < 7; n += 1) await attacker.login({ ...student, password: 'wrong-password' });
    assert.equal((await attacker.login(student)).status, 429);
    assert.equal((await edge.login(student)).status, 200);
  });

  it('a correct password starts the account + IP count again', async () => {
    const { student, edge } = await trustedEdge('203.0.113.33');
    for (let n = 0; n < 4; n += 1) await edge.login({ ...student, password: 'wrong-password' });
    assert.equal((await edge.login(student)).status, 200);
    await edge.post('/api/auth/logout');
    for (let n = 0; n < 4; n += 1) assert.equal((await edge.login({ ...student, password: 'wrong-password' })).status, 401);
  });

  it('one IP address: 20 failures on any accounts start a 5-minute cooldown', async () => {
    const ip = '192.0.2.60';
    for (let n = 0; n < 20; n += 1) {
      assert.equal((await browsers.firefox(server.base, ip).login({ ...newStudent(), password: 'wrong-password' })).status, 401);
    }
    const blocked = await browsers.firefox(server.base, ip).login({ ...newStudent(), password: 'wrong-password' });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.data.retryAfterSeconds, 300);
    assert.equal((await LoginActivity.countDocuments({ ip, user: null, reason: 'unknown_account' })), 20);
  });

  it('a trusted device is not slowed down by other failures on its shared IP address', async () => {
    const ip = '192.0.2.61';
    const { student, edge } = await trustedEdge(ip);
    for (let n = 0; n < 20; n += 1) await browsers.firefox(server.base, ip).login({ ...newStudent(), password: 'wrong-password' });
    assert.equal((await browsers.firefox(server.base, ip).login(student)).status, 429, 'a new browser on the busy IP waits');
    assert.equal((await edge.login(student)).status, 200, 'the trusted device does not');
  });

  it('parallel wrong passwords cannot go past the limit', async () => {
    const { student } = await trustedEdge('203.0.113.34');
    const attacker = browsers.firefox(server.base, '198.51.100.53');
    const results = await Promise.all(Array.from({ length: 15 }, () => attacker.login({ ...student, password: 'wrong-password' })));
    const checked = results.filter((result) => result.status === 401).length;
    assert.ok(checked <= 5, `${checked} passwords were checked`);
    assert.equal(results.filter((result) => result.status === 429).length, 15 - checked);
  });

  it('wrong passwords when confirming a sign-out count too', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.35');
    await edge.register(student);
    for (let n = 0; n < 5; n += 1) {
      assert.equal((await edge.post('/api/users/me/sessions/revoke-others', { password: 'wrong-password' })).status, 403);
    }
    assert.equal((await edge.post('/api/users/me/sessions/revoke-others', { password: student.password })).status, 429);
  });
});
