import Resume from '../models/Resume.js';
import { checkReadiness, cleanResume } from '../utils/resumeContent.js';

// The parts of a resume the API sends back.
function resumeResponse(resume) {
  return {
    personal: { ...resume.personal },
    summary: resume.summary,
    education: resume.education.map((entry) => ({ ...entry })),
    experience: resume.experience.map((entry) => ({ ...entry })),
    projects: resume.projects.map((entry) => ({ ...entry })),
    skills: [...resume.skills],
    certifications: [...resume.certifications],
    updatedAt: resume.updatedAt ?? null,
  };
}

// A new draft starts with the details of the account.
const emptyDraft = (user) => ({
  personal: { fullName: user.name, email: user.email, phone: user.phone, location: '', link: '' },
  summary: '',
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
});

// GET /api/resumes/me - the student's draft and what it still needs
export async function getMyResume(req, res) {
  const saved = await Resume.findOne({ user: req.user._id }).lean();
  const resume = saved ?? emptyDraft(req.user);
  res.json({ resume: resumeResponse(resume), readiness: checkReadiness(resume) });
}

// PUT /api/resumes/me - saves the draft (incomplete drafts are fine; too-long or badly formatted values are not)
export async function saveMyResume(req, res) {
  const { content, errors } = cleanResume(req.body ?? {});
  if (errors.length > 0) return res.status(400).json({ message: 'Please correct the highlighted parts of your resume.', errors });

  const resume = await Resume.findOneAndUpdate(
    { user: req.user._id },
    { $set: content },
    { upsert: true, returnDocument: 'after', lean: true },
  );
  res.json({ message: 'Resume saved.', resume: resumeResponse(resume), readiness: checkReadiness(resume) });
}
