import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import GeneratedResume from '../../src/models/GeneratedResume.js';
import { browsers } from '../helpers/browser.js';
import { advance, ist, newStudent, outbox, setTime, startTestServer } from '../helpers/testServer.js';

// Modules 1-5 keep working with the Module 6 sessions.
let server;
before(async () => {
  server = await startTestServer();
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

const resumeContent = (name) => ({
  personal: { fullName: name, email: 'asha@example.com', phone: '9876543210', location: 'Pune' },
  summary: 'Computer science student who enjoys building web applications.',
  education: [{ institution: 'Pune University', degree: 'B.Tech', startYear: '2023', endYear: '2027' }],
  experience: [],
  projects: [],
  skills: ['React', 'Node.js'],
  certifications: [],
});

describe('Module 4: resume PDF download links', () => {
  it('download with the session cookie, also after the token was replaced; owner only', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base);
    const userId = (await edge.register(student)).data.user.id;
    const pdf = await GeneratedResume.create({ user: userId, payment: new mongoose.Types.ObjectId(), content: resumeContent('Asha Verma') });
    const path = `/api/resumes/generated/${pdf._id}/pdf`;

    const download = await edge.get(path);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'application/pdf');
    assert.match(download.headers.get('content-disposition'), /Asha-Verma-Resume\.pdf/);
    assert.ok(download.data.startsWith('%PDF'));

    advance(16 * 60_000); // the session token is replaced on this download
    const before = edge.cookie('token');
    assert.equal((await edge.get(path)).status, 200);
    assert.notEqual(edge.cookie('token'), before);
    assert.equal((await edge.get(path)).status, 200);

    const other = browsers.edge(server.base, '203.0.113.200');
    await other.register(newStudent());
    assert.equal((await other.get(path)).status, 404);
    const guest = await browsers.edge(server.base).get(path);
    assert.equal(guest.status, 401);
    assert.equal(guest.data.code, 'NOT_LOGGED_IN');
  });
});

describe('Module 2: forgot password', () => {
  it('still resets the password, which then works for login', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.201');
    await edge.register(student);
    await edge.post('/api/auth/logout');
    assert.equal((await edge.post('/api/auth/forgot-password', { identifier: student.email })).status, 200);
    const code = [...outbox].reverse().find((m) => m.to === student.email).text.match(/reset code is (\d{6})/)[1];
    const reset = await edge.post('/api/auth/reset-password', { identifier: student.email, otp: code });
    assert.equal(reset.status, 200);
    assert.match(reset.data.password, /^[A-Za-z]{12}$/);
    assert.equal((await edge.login({ ...student, password: student.password })).status, 401);
    assert.equal((await edge.login({ ...student, password: reset.data.password })).status, 202);
  });
});

describe('Module 5: French needs an email code', () => {
  it('still works with the new sessions', async () => {
    const student = newStudent();
    const edge = browsers.edge(server.base, '203.0.113.202');
    await edge.register(student);
    assert.equal((await edge.request('PUT', '/api/users/me/language', { language: 'fr' })).status, 403);
    assert.equal((await edge.post('/api/users/me/language/french/otp')).status, 200);
    const code = [...outbox].reverse().find((m) => m.to === student.email).text.match(/is (\d{6})/)[1];
    const verified = await edge.post('/api/users/me/language/french/verify', { otp: code });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.user.preferredLanguage, 'fr');
    assert.equal((await edge.request('PUT', '/api/users/me/language', { language: 'es' })).status, 200);
  });
});

describe('privacy', () => {
  it("no IP address or device details appear in other students' data", async () => {
    const student = newStudent({ name: 'Privacy Check' });
    await browsers.edge(server.base, '203.0.113.203').register(student);
    const viewer = browsers.firefox(server.base, '203.0.113.204');
    await viewer.register(newStudent());
    for (const path of ['/api/users/search?q=Privacy', '/api/users/search', '/api/posts', '/api/auth/me']) {
      const result = await viewer.get(path);
      assert.equal(result.status, 200, path);
      const text = JSON.stringify(result.data);
      for (const field of ['"ip"', 'lastIp', 'userAgent', 'tokenHash', '203.0.113.203']) assert.equal(text.includes(field), false, `${path} contains ${field}`);
    }
  });
});
