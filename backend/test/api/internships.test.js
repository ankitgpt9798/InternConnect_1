import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import Internship, { ENGAGEMENTS, INTERNSHIP_CATEGORIES } from '../../src/models/Internship.js';
import { SAMPLE_INTERNSHIPS } from '../../src/seed/sampleInternships.js';
import { browsers } from '../helpers/browser.js';
import { ist, newStudent, setTime, startTestServer } from '../helpers/testServer.js';

// The Internships page filters (UI refresh): every filter on its own, combined, the sort orders and bad input.
// Deadlines use the real clock, like the listing query does.
const DAY_MS = 24 * 60 * 60 * 1000;
const samples = SAMPLE_INTERNSHIPS;
const count = (predicate) => samples.filter(predicate).length;

let server;
let student;
before(async () => {
  server = await startTestServer();
  await Internship.init();
  const now = Date.now();
  await Internship.insertMany(samples.map(({ applyInDays, ...sample }) => ({ ...sample, applyBy: new Date(now + applyInDays * DAY_MS) })));
  // A closed listing: never shown, whatever the filters.
  await Internship.create({
    ...samples[0],
    title: 'Closed Frontend Intern',
    applyBy: new Date(now - DAY_MS),
  });
  setTime(ist(11, 0));
  student = browsers.edge(server.base, '203.0.113.150');
  await student.register(newStudent());
});
after(() => server.stop());
beforeEach(() => setTime(ist(11, 0)));

async function list(query = '') {
  const response = await student.get(`/api/internships${query}`);
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return response.data;
}

describe('Internship list filters', () => {
  it('lists every open internship with its category and type, closing soonest first, plus the cities', async () => {
    const { internships, cities } = await list();
    assert.equal(internships.length, samples.length);
    assert.ok(!internships.some((item) => item.title === 'Closed Frontend Intern'));
    for (const item of internships) {
      assert.ok(INTERNSHIP_CATEGORIES.includes(item.category), item.title);
      assert.ok(ENGAGEMENTS.includes(item.engagement), item.title);
    }
    const deadlines = internships.map((item) => new Date(item.applyBy).getTime());
    assert.deepEqual(deadlines, [...deadlines].sort((a, b) => a - b));

    const expectedCities = [...new Set(samples.filter((s) => s.workMode !== 'remote').map((s) => s.location))].sort((a, b) => a.localeCompare(b, 'en'));
    assert.deepEqual(cities, expectedCities);
    assert.ok(!cities.includes('Remote'));
  });

  it('every category has at least two sample listings, valid for the model, and its filter shows only them', async () => {
    for (const sample of samples) {
      const { applyInDays, ...fields } = sample;
      await assert.doesNotReject(new Internship({ ...fields, applyBy: new Date(Date.now() + applyInDays * DAY_MS) }).validate(), sample.title);
    }
    for (const category of INTERNSHIP_CATEGORIES) {
      const expected = count((s) => s.category === category);
      assert.ok(expected >= 2, `${category} has ${expected} sample listings`);
      const { internships } = await list(`?category=${category}`);
      assert.equal(internships.length, expected, category);
      assert.ok(internships.every((item) => item.category === category));
    }
  });

  it('filters by type, work mode, city (any letter case), stipend and duration', async () => {
    const partTime = await list('?engagement=part_time');
    assert.equal(partTime.internships.length, count((s) => s.engagement === 'part_time'));
    assert.ok(partTime.internships.length >= 3);
    assert.ok(partTime.internships.every((item) => item.engagement === 'part_time'));

    const fullTime = await list('?engagement=full_time');
    assert.equal(fullTime.internships.length, count((s) => s.engagement === 'full_time'));

    const remote = await list('?workMode=remote');
    assert.equal(remote.internships.length, count((s) => s.workMode === 'remote'));

    const pune = await list('?city=pune');
    assert.equal(pune.internships.length, count((s) => s.location === 'Pune'));
    assert.ok(pune.internships.length >= 2);
    assert.ok(pune.internships.every((item) => item.location === 'Pune'));

    const wellPaid = await list('?minStipend=20000');
    assert.equal(wellPaid.internships.length, count((s) => s.stipend.max >= 20000));
    assert.ok(wellPaid.internships.every((item) => item.stipend.max >= 20000));

    const short = await list('?maxDuration=2');
    assert.equal(short.internships.length, count((s) => s.durationMonths <= 2));
    assert.ok(short.internships.every((item) => item.durationMonths <= 2));
    assert.equal((await list('?maxDuration=1')).internships.length, count((s) => s.durationMonths <= 1));
  });

  it('combines filters with each other and with the search words', async () => {
    const designPartTime = await list('?category=design&engagement=part_time');
    assert.deepEqual(
      designPartTime.internships.map((item) => item.title),
      samples.filter((s) => s.category === 'design' && s.engagement === 'part_time').map((s) => s.title),
    );

    const kolkataWeb = await list('?category=web_development&city=Kolkata');
    assert.deepEqual(kolkataWeb.internships.map((item) => item.title), ['WordPress Developer Intern']);

    const python = await list('?search=python&category=data_science');
    assert.equal(python.internships.length, count((s) => s.category === 'data_science' && s.skills.some((skill) => /python/i.test(skill))));
    assert.ok(python.internships.length >= 2);

    const mixed = await list('?workMode=remote&maxDuration=3&minStipend=5000');
    assert.equal(mixed.internships.length, count((s) => s.workMode === 'remote' && s.durationMonths <= 3 && s.stipend.max >= 5000));
    assert.ok(mixed.internships.length >= 1);

    assert.equal((await list('?category=finance&workMode=remote')).internships.length, count((s) => s.category === 'finance' && s.workMode === 'remote'));
  });

  it('sorts by highest stipend and by newest', async () => {
    const byStipend = (await list('?sort=stipend')).internships.map((item) => item.stipend.max);
    assert.deepEqual(byStipend, [...byStipend].sort((a, b) => b - a));

    const fresh = await Internship.create({ ...samples[1], title: 'Brand New Backend Intern', applyBy: new Date(Date.now() + 60 * DAY_MS) });
    try {
      assert.equal((await list('?sort=newest')).internships[0].title, 'Brand New Backend Intern');
      assert.notEqual((await list()).internships[0].title, 'Brand New Backend Intern'); // the default stays "closing soon"
    } finally {
      await fresh.deleteOne();
    }
  });

  it('ignores unknown, invalid or injected filter values', async () => {
    const everything = samples.length;
    const ignored = [
      '?category=hacking',
      '?category=__proto__',
      '?category[$ne]=design',
      '?category=design&category=finance',
      '?engagement=sometimes',
      '?workMode=moon',
      '?minStipend=abc',
      '?minStipend=-5',
      '?minStipend=0',
      '?minStipend[$gt]=0',
      '?maxDuration=0',
      '?maxDuration=99',
      '?maxDuration=2.5',
      '?sort=constructor',
      '?sort=__proto__',
      '?sort=evil',
      '?city=',
    ];
    for (const query of ignored) {
      assert.equal((await list(query)).internships.length, everything, query);
    }
    // City and search words are matched as plain text, never as patterns.
    assert.equal((await list('?city=.*')).internships.length, 0);
    assert.equal((await list('?city=Pun')).internships.length, 0);
    assert.equal((await list('?search=.*')).internships.length, 0);
  });

  it('a listing saved before categories existed still shows, counts as full time and has no category', async () => {
    const { insertedId } = await Internship.collection.insertOne({
      title: 'Legacy Listing Intern',
      company: 'Old Data Co.',
      location: 'Delhi',
      workMode: 'office',
      stipend: { min: 5000, max: 6000 },
      durationMonths: 3,
      skills: [],
      description: 'Saved before the category and type fields were added.',
      applyBy: new Date(Date.now() + 5 * DAY_MS),
    });
    try {
      const legacy = (await list()).internships.find((item) => item.title === 'Legacy Listing Intern');
      assert.equal(legacy.category, null);
      assert.equal(legacy.engagement, 'full_time');
      assert.ok((await list('?engagement=full_time')).internships.some((item) => item.title === 'Legacy Listing Intern'));
      assert.ok(!(await list('?engagement=part_time')).internships.some((item) => item.title === 'Legacy Listing Intern'));
      assert.ok(!(await list('?category=finance')).internships.some((item) => item.title === 'Legacy Listing Intern'));
      const detail = await student.get(`/api/internships/${insertedId}`);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.internship.category, null);
    } finally {
      await Internship.collection.deleteOne({ _id: insertedId });
    }
  });

  it('the detail answer includes the category and type; guests still have to log in', async () => {
    const { internships } = await list('?category=human_resources');
    const detail = await student.get(`/api/internships/${internships[0].id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.internship.category, 'human_resources');
    assert.ok(ENGAGEMENTS.includes(detail.data.internship.engagement));

    const guest = await browsers.edge(server.base, '203.0.113.151').get('/api/internships?category=design');
    assert.equal(guest.status, 401);
    assert.equal(guest.data.code, 'NOT_LOGGED_IN');
  });
});
