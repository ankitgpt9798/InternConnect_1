import mongoose from 'mongoose';
import Application, { COVER_LETTER_MAX, COVER_LETTER_MIN } from '../models/Application.js';
import Internship, { WORK_MODES } from '../models/Internship.js';
import { getApplicationQuota } from '../utils/quota.js';
import { escapeRegex, toText } from '../utils/validators.js';

function internshipResponse(internship, application = null) {
  return {
    id: internship._id,
    title: internship.title,
    company: internship.company,
    location: internship.location,
    workMode: internship.workMode,
    stipend: { min: internship.stipend.min, max: internship.stipend.max },
    durationMonths: internship.durationMonths,
    skills: internship.skills,
    description: internship.description,
    applyBy: internship.applyBy,
    isOpen: internship.applyBy > new Date(),
    appliedAt: application ? application.createdAt : null, // null = not applied yet
  };
}

const notFound = (res) => res.status(404).json({ message: 'Internship not found.' });

// GET /api/internships?search=react&workMode=remote - open internships, closing soonest first
export async function getInternships(req, res) {
  const filter = { applyBy: { $gt: new Date() } };

  const search = toText(req.query.search).slice(0, 50);
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ title: pattern }, { company: pattern }, { skills: pattern }, { location: pattern }];
  }
  const workMode = toText(req.query.workMode);
  if (WORK_MODES.includes(workMode)) filter.workMode = workMode;

  const internships = await Internship.find(filter).sort({ applyBy: 1 });
  const applications = await Application.find({ user: req.user._id, internship: { $in: internships.map((item) => item._id) } });

  res.json({
    internships: internships.map((internship) =>
      internshipResponse(internship, applications.find((application) => application.internship.equals(internship._id))),
    ),
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

// POST /api/internships/:id/apply  { coverLetter }
export async function applyToInternship(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
  const internship = await Internship.findById(req.params.id);
  if (!internship) return notFound(res);

  const coverLetter = toText(req.body?.coverLetter);
  if (coverLetter.length < COVER_LETTER_MIN || coverLetter.length > COVER_LETTER_MAX) {
    return res.status(400).json({ message: `Write a cover letter of ${COVER_LETTER_MIN} to ${COVER_LETTER_MAX} characters.` });
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

  try {
    const application = await Application.create({ user: req.user._id, internship: internship._id, coverLetter });
    res.status(201).json({
      message: `You applied for ${internship.title} at ${internship.company}.`,
      appliedAt: application.createdAt,
      quota: await getApplicationQuota(req.user),
    });
  } catch (error) {
    // Two applications sent at the same moment: the unique index stops the second one.
    if (error.code === 11000) return res.status(409).json({ message: 'You have already applied for this internship.' });
    throw error;
  }
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
        internship: internshipResponse(application.internship, application),
      })),
  });
}
