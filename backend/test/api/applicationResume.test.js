import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import Application from '../../src/models/Application.js';
import ApplicationResume from '../../src/models/ApplicationResume.js';
import GeneratedResume from '../../src/models/GeneratedResume.js';
import Internship from '../../src/models/Internship.js';
import User from '../../src/models/User.js';
import { resumePdfBuffer } from '../../src/utils/resumePdf.js';
import { browsers } from '../helpers/browser.js';
import { ist, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

// Internship applications need a resume: an uploaded PDF (up to 2 MB) or the student's InternConnect resume. The PDF is
// stored privately and only the student who applied can download it.
const DAY_MS = 24 * 60 * 60 * 1000;
const COVER = 'I enjoy building accessible web apps and would love to learn from your team during this internship.';
const content = (name) => ({
  personal: { fullName: name, email: 'asha@example.com', phone: '9876543210', location: 'Pune' },
  summary: 'Computer science student who enjoys building web applications.',
  education: [{ institution: 'Pune University', degree: 'B.Tech', startYear: '2023', endYear: '2027' }],
  experience: [],
  projects: [],
  skills: ['React', 'Node.js'],
  certifications: [],
});

let server;
let pdf;
const open = {};
let closed;
let ipCounter = 10;

before(async () => {
  server = await startTestServer();
  await Promise.all([Application.init(), ApplicationResume.init(), Internship.init()]);
  pdf = await resumePdfBuffer(content('Test Student'));
  const base = { company: 'Test Co', location: 'Pune', workMode: 'office', category: 'web_development', stipend: { min: 5000, max: 8000 }, durationMonths: 3, skills: ['React'], description: 'A test listing.' };
  for (const key of ['a', 'b', 'c']) open[key] = await Internship.create({ ...base, title: `Open Intern ${key}`, applyBy: new Date(Date.now() + 10 * DAY_MS) });
  closed = await Internship.create({ ...base, title: 'Closed Intern', applyBy: new Date(Date.now() - DAY_MS) });
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

async function signUp() {
  ipCounter += 1;
  const student = newStudent();
  const browser = browsers.edge(server.base, `203.0.113.${ipCounter}`);
  const registered = await browser.register(student);
  return { browser, student, userId: registered.data.user.id };
}

const giveGoldPlan = (userId) =>
  User.updateOne({ _id: userId }, { subscription: { plan: 'gold', startedAt: new Date(Date.now() - DAY_MS), expiresAt: new Date(Date.now() + 20 * DAY_MS) } });

function form({ coverLetter = COVER, file = null, generatedResumeId = null } = {}) {
  const data = new FormData();
  data.append('coverLetter', coverLetter);
  if (file) data.append('resume', new Blob([file.bytes], { type: file.type }), file.name);
  if (generatedResumeId) data.append('generatedResumeId', generatedResumeId);
  return data;
}
const pdfFile = (name = 'resume.pdf', bytes = pdf) => ({ bytes, type: 'application/pdf', name });
const apply = (browser, internship, options) => browser.postForm(`/api/internships/${internship._id}/apply`, form(options));
const storedFor = async (userId) => ({
  applications: await Application.countDocuments({ user: userId }),
  resumes: await ApplicationResume.countDocuments({ user: userId }),
});

describe('Applying with a resume', () => {
  it('applies with an uploaded PDF; only the student who applied can download it', async () => {
    const { browser, userId } = await signUp();
    const sent = await apply(browser, open.a, { file: pdfFile('My Resume (final).pdf') });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    assert.deepEqual(sent.data.resume, { fileName: 'My Resume (final).pdf', size: pdf.length, source: 'upload' });
    assert.ok(sent.data.applicationId);

    const list = await browser.get('/api/applications');
    assert.deepEqual(list.data.applications[0].resume, sent.data.resume);
    assert.ok(!JSON.stringify(list.data).includes('"data"'), 'the listing never contains the file');
    const detail = await browser.get(`/api/internships/${open.a._id}`);
    assert.equal(detail.data.internship.applicationId, String(sent.data.applicationId));
    assert.equal(detail.data.internship.resume.fileName, 'My Resume (final).pdf');

    const path = `/api/applications/${sent.data.applicationId}/resume`;
    const download = await browser.download(path);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('content-type'), 'application/pdf');
    assert.equal(download.headers.get('content-disposition'), 'attachment; filename="My Resume (final).pdf"');
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.match(download.headers.get('cache-control'), /no-store/);
    assert.ok(download.bytes.equals(pdf), 'the same bytes come back');

    const other = await signUp();
    assert.equal((await other.browser.download(path)).status, 404);
    const guest = await browsers.edge(server.base, '203.0.113.250').download(path);
    assert.equal(guest.status, 401);
    assert.deepEqual(await storedFor(userId), { applications: 1, resumes: 1 });
  });

  it('refuses an application without a resume and does not use up the plan', async () => {
    const { browser, userId } = await signUp();
    const json = await browser.post(`/api/internships/${open.a._id}/apply`, { coverLetter: COVER });
    assert.equal(json.status, 400);
    assert.equal(json.data.code, 'RESUME_REQUIRED');
    const noFile = await apply(browser, open.a, {});
    assert.equal(noFile.status, 400);
    assert.equal(noFile.data.code, 'RESUME_REQUIRED');
    assert.deepEqual(await storedFor(userId), { applications: 0, resumes: 0 });
    // The Free plan's one application a month is still available.
    assert.equal((await apply(browser, open.a, { file: pdfFile() })).status, 201);
  });

  it('refuses files that are not real PDFs, files over 2 MB and two resumes at once; nothing is stored', async () => {
    const { browser, userId } = await signUp();
    const renamed = await apply(browser, open.a, { file: { bytes: Buffer.from('This is a text file, not a resume.\n'.repeat(10)), type: 'application/pdf', name: 'resume.pdf' } });
    assert.equal(renamed.status, 400);
    assert.equal(renamed.data.code, 'RESUME_NOT_PDF');

    const photo = await apply(browser, open.a, { file: { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), type: 'image/png', name: 'resume.png' } });
    assert.equal(photo.status, 400);
    assert.equal(photo.data.code, 'RESUME_NOT_PDF');

    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(2 * 1024 * 1024), Buffer.from('\n%%EOF\n')]);
    const tooLarge = await apply(browser, open.a, { file: pdfFile('big.pdf', big) });
    assert.equal(tooLarge.status, 400);
    assert.equal(tooLarge.data.code, 'RESUME_TOO_LARGE');

    const generated = await GeneratedResume.create({ user: userId, payment: new mongoose.Types.ObjectId(), content: content('Two Resumes') });
    const both = await apply(browser, open.a, { file: pdfFile(), generatedResumeId: String(generated._id) });
    assert.equal(both.status, 400);
    assert.equal(both.data.code, 'RESUME_CHOOSE_ONE');

    const shortLetter = await apply(browser, open.a, { coverLetter: 'Too short.', file: pdfFile() });
    assert.equal(shortLetter.status, 400);
    assert.deepEqual(await storedFor(userId), { applications: 0, resumes: 0 });
  });

  it('cleans up the file name', async () => {
    const { browser } = await signUp();
    const sent = await apply(browser, open.a, { file: pdfFile('..\\..\\C:/Users/x/"évil"<script>.PDF') });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    assert.equal(sent.data.resume.fileName, 'vilscript.pdf');
    const download = await browser.download(`/api/applications/${sent.data.applicationId}/resume`);
    assert.equal(download.headers.get('content-disposition'), 'attachment; filename="vilscript.pdf"');
  });

  it("uses the student's InternConnect resume; another student's cannot be used", async () => {
    const { browser, userId } = await signUp();
    const generated = await GeneratedResume.create({ user: userId, payment: new mongoose.Types.ObjectId(), content: content('Asha Verma') });
    const sent = await browser.post(`/api/internships/${open.a._id}/apply`, { coverLetter: COVER, generatedResumeId: String(generated._id) });
    assert.equal(sent.status, 201, JSON.stringify(sent.data));
    assert.equal(sent.data.resume.source, 'internconnect');
    assert.equal(sent.data.resume.fileName, 'Asha-Verma-Resume.pdf');
    const download = await browser.download(`/api/applications/${sent.data.applicationId}/resume`);
    assert.equal(download.status, 200);
    assert.equal(download.bytes.subarray(0, 5).toString(), '%PDF-');
    assert.equal(download.bytes.length, sent.data.resume.size);

    const other = await signUp();
    const stolen = await other.browser.post(`/api/internships/${open.a._id}/apply`, { coverLetter: COVER, generatedResumeId: String(generated._id) });
    assert.equal(stolen.status, 400);
    assert.equal(stolen.data.code, 'RESUME_NOT_FOUND');
    const invalid = await other.browser.post(`/api/internships/${open.a._id}/apply`, { coverLetter: COVER, generatedResumeId: 'not-an-id' });
    assert.equal(invalid.data.code, 'RESUME_NOT_FOUND');
    assert.deepEqual(await storedFor(other.userId), { applications: 0, resumes: 0 });
  });

  it('a second application to the same internship (also at the same moment) is refused without keeping another resume', async () => {
    const { browser, userId } = await signUp();
    await giveGoldPlan(userId);
    assert.equal((await apply(browser, open.a, { file: pdfFile() })).status, 201);
    const again = await apply(browser, open.a, { file: pdfFile() });
    assert.equal(again.status, 409);

    const together = await Promise.all([apply(browser, open.b, { file: pdfFile() }), apply(browser, open.b, { file: pdfFile() })]);
    assert.deepEqual(together.map((r) => r.status).sort(), [201, 409]);
    assert.deepEqual(await storedFor(userId), { applications: 2, resumes: 2 });
  });

  it('nothing is stored when the plan has no applications left or the internship is closed', async () => {
    const { browser, userId } = await signUp();
    assert.equal((await apply(browser, closed, { file: pdfFile() })).status, 400);
    assert.equal((await apply(browser, open.a, { file: pdfFile() })).status, 201); // the Free plan's one application
    const noneLeft = await apply(browser, open.b, { file: pdfFile() });
    assert.equal(noneLeft.status, 403);
    assert.deepEqual(await storedFor(userId), { applications: 1, resumes: 1 });
  });

  it('applications sent before resumes were required still list, with no resume and no download', async () => {
    const { browser, userId } = await signUp();
    const old = await Application.create({ user: userId, internship: open.c._id, coverLetter: COVER });
    const list = await browser.get('/api/applications');
    assert.equal(list.data.applications[0].resume, null);
    assert.equal((await browser.get(`/api/internships/${open.c._id}`)).data.internship.resume, null);
    assert.equal((await browser.download(`/api/applications/${old._id}/resume`)).status, 404);
    assert.equal((await browser.download('/api/applications/not-an-id/resume')).status, 404);
  });
});
