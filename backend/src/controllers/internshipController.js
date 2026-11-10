import mongoose from 'mongoose';
import Application, { COVER_LETTER_MAX, COVER_LETTER_MIN } from '../models/Application.js';
import ApplicationResume from '../models/ApplicationResume.js';
import GeneratedResume from '../models/GeneratedResume.js';
import Internship, { ENGAGEMENTS, INTERNSHIP_CATEGORIES, WORK_MODES } from '../models/Internship.js';
import { getApplicationQuota } from '../utils/quota.js';
import { resumePdfBuffer } from '../utils/resumePdf.js';
import { escapeRegex, toText } from '../utils/validators.js';

// What the student sees about the resume sent with an application (never the file itself).
const resumeInfo = (application) =>
  application?.resume?.file ? { fileName: application.resume.fileName, size: application.resume.size, source: application.resume.source } : null;

// A real PDF starts with "%PDF-" (allowed within the first 1 KB) and ends with "%%EOF" (allowed a little before the
// end). Checking the bytes means a renamed photo or document is refused even if it is sent as "application/pdf".
function looksLikePdf(buffer) {
  if (!buffer || buffer.length < 16) return false;
  return buffer.subarray(0, 1024).includes('%PDF-') && buffer.subarray(Math.max(0, buffer.length - 2048)).includes('%%EOF');
}

// "My Resume (final).pdf" stays readable; paths, quotes and unusual characters are removed.
function safePdfName(original) {
  const base = String(original ?? '')
    .split(/[\\/]/)
    .pop()
    .replace(/\.pdf$/i, '');
  const clean = base
    .replace(/[^A-Za-z0-9 ._()-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${clean || 'resume'}.pdf`;
}

function internshipResponse(internship, application = null) {
  return {
    id: internship._id,
    title: internship.title,
    company: internship.company,
    location: internship.location,
    workMode: internship.workMode,
    category: internship.category ?? null, // null for a listing saved before categories existed
    engagement: internship.engagement ?? 'full_time',
    stipend: { min: internship.stipend.min, max: internship.stipend.max },
    durationMonths: internship.durationMonths,
    skills: internship.skills,
    description: internship.description,
    applyBy: internship.applyBy,
    isOpen: internship.applyBy > new Date(),
    appliedAt: application ? application.createdAt : null, // null = not applied yet
    applicationId: application ? application._id : null,
    resume: resumeInfo(application), // the resume sent with the student's application, if any
  };
}

const notFound = (res) => res.status(404).json({ message: 'Internship not found.' });

// The orders the list can be shown in; closing soonest first unless the student picks another.
const SORTS = {
  deadline: { applyBy: 1, _id: 1 },
  newest: { createdAt: -1, _id: -1 },
  stipend: { 'stipend.max': -1, applyBy: 1, _id: 1 },
};

// A whole number from the query string within [min, max], or null (then the filter is not used).
function wholeNumber(value, min, max) {
  const text = toText(value);
  if (!/^\d{1,7}$/.test(text)) return null;
  const number = Number(text);
  return number >= min && number <= max ? number : null;
}

// GET /api/internships - open internships. Optional filters (an unknown or invalid value is ignored):
//   search       words in the title, company, skills or city
//   category     one of INTERNSHIP_CATEGORIES        workMode    remote | office | hybrid
//   engagement   full_time | part_time               city        exact city name (any letter case)
//   minStipend   the top of the stipend range is at least this many rupees a month
//   maxDuration  lasts at most this many months      sort        deadline (default) | newest | stipend
// The answer also lists the cities that have open internships, for the City filter.
export async function getInternships(req, res) {
  const now = new Date();
  const filter = { applyBy: { $gt: now } };

  const search = toText(req.query.search).slice(0, 50);
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ title: pattern }, { company: pattern }, { skills: pattern }, { location: pattern }];
  }
  const workMode = toText(req.query.workMode);
  if (WORK_MODES.includes(workMode)) filter.workMode = workMode;

  const category = toText(req.query.category);
  if (INTERNSHIP_CATEGORIES.includes(category)) filter.category = category;

  const engagement = toText(req.query.engagement);
  // A listing saved before this field existed counts as full time (the default).
  if (ENGAGEMENTS.includes(engagement)) filter.engagement = engagement === 'full_time' ? { $in: ['full_time', null] } : engagement;

  const city = toText(req.query.city).slice(0, 50);
  if (city) filter.location = { $regex: `^${escapeRegex(city)}$`, $options: 'i' };

  const minStipend = wholeNumber(req.query.minStipend, 1, 1_000_000);
  if (minStipend !== null) filter['stipend.max'] = { $gte: minStipend };

  const maxDuration = wholeNumber(req.query.maxDuration, 1, 24);
  if (maxDuration !== null) filter.durationMonths = { $lte: maxDuration };

  const sortKey = toText(req.query.sort);
  const sort = Object.hasOwn(SORTS, sortKey) ? SORTS[sortKey] : SORTS.deadline;

  const [internships, locations] = await Promise.all([
    Internship.find(filter).sort(sort),
    Internship.distinct('location', { applyBy: { $gt: now }, workMode: { $ne: 'remote' } }),
  ]);
  const applications = await Application.find({ user: req.user._id, internship: { $in: internships.map((item) => item._id) } });

  res.json({
    internships: internships.map((internship) =>
      internshipResponse(internship, applications.find((application) => application.internship.equals(internship._id))),
    ),
    cities: locations.filter((location) => location.toLowerCase() !== 'remote').sort((a, b) => a.localeCompare(b, 'en')),
  });
}

// GET /api/internships/:id
export async function getInternship(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const internship = await Internship.findById(req.params.id);
  if (!internship) return notFound(res);

  const application = await Application.findOne({ user: req.user._id, internship: internship._id });
  res.json({ internship: internshipResponse(internship, application) });
}

// POST /api/internships/:id/apply - a cover letter and a resume, which is either
//   an uploaded PDF (form field "resume", sent as multipart/form-data with "coverLetter"), or
//   the student's InternConnect resume PDF from the Resume Builder ({ coverLetter, generatedResumeId }).
// Everything is checked before anything is saved; the resume and the application are then saved together.
export async function applyToInternship(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const internship = await Internship.findById(req.params.id);
  if (!internship) return notFound(res);

  const coverLetter = toText(req.body?.coverLetter);
  if (coverLetter.length < COVER_LETTER_MIN || coverLetter.length > COVER_LETTER_MAX) {
    return res.status(400).json({ message: `Write a cover letter of ${COVER_LETTER_MIN} to ${COVER_LETTER_MAX} characters.` });
  }

  const generatedResumeId = toText(req.body?.generatedResumeId);
  if (req.file && generatedResumeId) {
    return res.status(400).json({ code: 'RESUME_CHOOSE_ONE', message: 'Choose one resume: upload a PDF or use your InternConnect resume.' });
  }
  if (!req.file && !generatedResumeId) {
    return res.status(400).json({ code: 'RESUME_REQUIRED', message: 'Attach your resume as a PDF, or use your InternConnect resume.' });
  }
  if (req.file && !looksLikePdf(req.file.buffer)) {
    return res.status(400).json({ code: 'RESUME_NOT_PDF', message: 'This file is not a valid PDF. Save your resume as a PDF and try again.' });
  }
  let generated = null;
  if (generatedResumeId) {
    generated = mongoose.isValidObjectId(generatedResumeId) ? await GeneratedResume.findOne({ _id: generatedResumeId, user: req.user._id }).lean() : null;
    if (!generated) return res.status(400).json({ code: 'RESUME_NOT_FOUND', message: 'That InternConnect resume was not found. Upload a PDF instead.' });
  }

  if (internship.applyBy <= new Date()) {
    return res.status(400).json({ message: 'Applications for this internship are closed.' });
  }
  if (await Application.exists({ user: req.user._id, internship: internship._id })) {
    return res.status(409).json({ message: 'You have already applied for this internship.' });
  }

  // Each plan allows a number of applications a month (Free 1, Bronze 3, Silver 5, Gold unlimited).
  const quota = await getApplicationQuota(req.user);
  if (quota.remaining === 0) {
    const period = quota.plan.id === 'free' ? 'this month' : 'this plan period';
    return res.status(403).json({
      message: `You have used all ${quota.limit} of your ${quota.plan.name} plan's applications for ${period}. Upgrade your plan to apply for more.`,
      quota,
    });
  }

  const resumeFile = req.file
    ? { fileName: safePdfName(req.file.originalname), data: req.file.buffer, source: 'upload' }
    : {
        fileName: `${generated.content.personal.fullName.replace(/[^A-Za-z0-9]+/g, '-')}-Resume.pdf`,
        data: await resumePdfBuffer(generated.content),
        source: 'internconnect',
      };

  let application = null;
  try {
    // One transaction: if the application cannot be saved, its resume is not kept either.
    await mongoose.connection.transaction(async (dbSession) => {
      const [stored] = await ApplicationResume.create(
        [{ user: req.user._id, fileName: resumeFile.fileName, size: resumeFile.data.length, source: resumeFile.source, data: resumeFile.data }],
        { session: dbSession },
      );
      [application] = await Application.create(
        [
          {
            user: req.user._id,
            internship: internship._id,
            coverLetter,
            resume: { file: stored._id, fileName: stored.fileName, size: stored.size, source: stored.source },
          },
        ],
        { session: dbSession },
      );
    });
  } catch (error) {
    // Two applications sent at the same moment: the unique index stops the second one.
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied for this internship.' });
    throw error;
  }

  res.status(201).json({
    message: `You applied for ${internship.title} at ${internship.company}.`,
    appliedAt: application.createdAt,
    applicationId: application._id,
    resume: resumeInfo(application),
    quota: await getApplicationQuota(req.user),
  });
}

// GET /api/applications/:id/resume - the resume PDF sent with one of the student's own applications. Anyone else
// (another student, or an application without a resume) gets "not found", so it does not reveal that it exists.
export async function downloadApplicationResume(req, res) {
  const missing = () => res.status(404).json({ message: 'Resume not found.' });
  if (!mongoose.isValidObjectId(req.params.id)) return missing();
  const application = await Application.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!application?.resume?.file) return missing();
  const file = await ApplicationResume.findOne({ _id: application.resume.file, user: req.user._id });
  if (!file) return missing();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${file.fileName.replace(/["\\\r\n]/g, '')}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(Buffer.from(file.data));
}

// GET /api/applications - the logged-in student's applications, newest first
export async function getMyApplications(req, res) {
  const applications = await Application.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('internship');

  res.json({
    applications: applications
      .filter((application) => application.internship) // skips listings removed from the database
      .map((application) => ({
        id: application._id,
        coverLetter: application.coverLetter,
        appliedAt: application.createdAt,
        resume: resumeInfo(application),
        internship: internshipResponse(application.internship, application),
      })),
  });
}
