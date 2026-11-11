import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import { browsers } from '../helpers/browser.js';
import { ist, newStudent, outbox, setTime, startTestServer } from '../helpers/testServer.js';

// Password reset by mobile number uses a mock SMS that prints the message (with its code) in the backend terminal.
// In production that terminal is the server log, so the option is turned off there: refused before any account lookup,
// and nothing is printed. Locally it keeps working. Reset by email works in both.
let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));
afterEach(() => {
  process.env.NODE_ENV = 'test';
  mock.restoreAll();
});

describe('password reset by mobile number', () => {
  it('in production: refused (SMS_UNAVAILABLE) for a known and an unknown number alike, and no code is printed', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.170');
    await edge.register(student);
    const logged = mock.method(console, 'log', () => {});

    process.env.NODE_ENV = 'production';
    const known = await edge.post('/api/auth/forgot-password', { identifier: student.phone });
    const unknown = await edge.post('/api/auth/forgot-password', { identifier: '9000000001' });
    const resetByPhone = await edge.post('/api/auth/reset-password', { identifier: student.phone, otp: '123456' });
    process.env.NODE_ENV = 'test';

    for (const answer of [known, unknown, resetByPhone]) {
      assert.equal(answer.status, 400);
      assert.equal(answer.data.code, 'SMS_UNAVAILABLE');
    }
    assert.deepEqual(known.data, unknown.data, 'the answer does not reveal whether the number has an account');
    assert.equal(logged.mock.callCount(), 0, 'nothing printed');
  });

  it('in production: reset by email still sends the code by email (not printed)', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.171');
    await edge.register(student);
    const logged = mock.method(console, 'log', () => {});
    const before = outbox.length;

    process.env.NODE_ENV = 'production';
    const answer = await edge.post('/api/auth/forgot-password', { identifier: student.email });
    process.env.NODE_ENV = 'test';

    assert.equal(answer.status, 200, JSON.stringify(answer.data));
    assert.equal(answer.data.channel, 'email');
    assert.ok(!JSON.stringify(answer.data).match(/\b\d{6}\b/), 'the answer never contains the code');
    const mail = outbox.slice(before).find((message) => message.to === student.email);
    assert.match(mail.subject, /password reset code/);
    assert.equal(logged.mock.callCount(), 0);
  });

  it('locally (not production): the mock SMS still works and prints the message in the terminal', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.172');
    await edge.register(student);
    const printed = [];
    mock.method(console, 'log', (line) => printed.push(String(line)));

    const answer = await edge.post('/api/auth/forgot-password', { identifier: student.phone });
    assert.equal(answer.status, 200, JSON.stringify(answer.data));
    assert.equal(answer.data.channel, 'phone');
    assert.ok(printed.some((line) => line.startsWith('[Mock SMS to') && /\b\d{6}\b/.test(line)));
  });
});
