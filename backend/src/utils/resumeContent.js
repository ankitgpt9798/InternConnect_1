import { EMAIL_REGEX } from './validators.js';

// Limits for every part of the resume.
export const LIMITS = { education: 5, experience: 5, projects: 5, skills: 30, certifications: 10 };
const SUMMARY_MIN = 30;

// The PDF uses PDFKit's built-in fonts, which can print English (Latin) letters and common punctuation only.
// Anything else (₹, Hindi, emoji, …) would come out garbled, so the readiness check asks the student to remove it.
const PRINTABLE = /^[\n\r\t\x20-\x7E\xA0-\xFF–—‘’“”•…€]*$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

const text = (value) => (typeof value === 'string' ? value.trim() : '');

// Reads the resume sent by the browser. Returns { content, errors }: content keeps only known fields,
// errors lists values that are too long, badly formatted or too many. Missing information is allowed in a draft.
export function cleanResume(body = {}) {
  const errors = [];
  const field = (value, path, label, max) => {
    const result = text(value);
    if (result.length > max) errors.push({ field: path, message: `${label} can be at most ${max} characters.` });
    return result;
  };
  const link = (value, path, label) => {
    const result = field(value, path, label, 200);
    if (result && !URL_PATTERN.test(result)) errors.push({ field: path, message: `${label} must start with http:// or https://` });
    return result;
  };
  // A list of entries: entries where every field is empty are dropped.
  const list = (value, name, max, read) => {
    const entries = (Array.isArray(value) ? value : []).map((entry, index) => read(entry ?? {}, `${name}.${index}`));
    const kept = entries.filter((entry) => Object.values(entry).some(Boolean));
    if (kept.length > max) errors.push({ field: name, message: `Add at most ${max} ${name} entries.` });
    return kept.slice(0, max);
  };
  const words = (value, name, label, max, maxLength) => {
    const items = (Array.isArray(value) ? value : []).map(text).filter(Boolean);
    // No repeats in any case ("React" and "react"); the first spelling is kept.
    const unique = [];
    for (const item of items) {
      if (!unique.some((kept) => kept.toLowerCase() === item.toLowerCase())) unique.push(item);
    }
    if (unique.length > max) errors.push({ field: name, message: `Add at most ${max} ${label}.` });
    unique.forEach((item, index) => {
      if (item.length > maxLength) errors.push({ field: `${name}.${index}`, message: `Each of the ${label} can be at most ${maxLength} characters.` });
    });
    return unique.slice(0, max);
  };

  const personal = body.personal ?? {};
  const content = {
    personal: {
      fullName: field(personal.fullName, 'personal.fullName', 'Full name', 60),
      email: field(personal.email, 'personal.email', 'Email', 254).toLowerCase(),
      phone: field(personal.phone, 'personal.phone', 'Phone', 20),
      location: field(personal.location, 'personal.location', 'City', 60),
      link: link(personal.link, 'personal.link', 'LinkedIn or portfolio link'),
    },
    summary: field(body.summary, 'summary', 'Summary', 600),
    education: list(body.education, 'education', LIMITS.education, (entry, path) => ({
      institution: field(entry.institution, `${path}.institution`, 'Institution', 100),
      degree: field(entry.degree, `${path}.degree`, 'Degree', 100),
      startYear: field(entry.startYear, `${path}.startYear`, 'Start year', 10),
      endYear: field(entry.endYear, `${path}.endYear`, 'End year', 10),
      score: field(entry.score, `${path}.score`, 'Score', 20),
    })),
    experience: list(body.experience, 'experience', LIMITS.experience, (entry, path) => ({
      company: field(entry.company, `${path}.company`, 'Company', 100),
      role: field(entry.role, `${path}.role`, 'Role', 100),
      startDate: field(entry.startDate, `${path}.startDate`, 'Start date', 20),
      endDate: field(entry.endDate, `${path}.endDate`, 'End date', 20),
      description: field(entry.description, `${path}.description`, 'Description', 600),
    })),
    projects: list(body.projects, 'projects', LIMITS.projects, (entry, path) => ({
      name: field(entry.name, `${path}.name`, 'Project name', 80),
      link: link(entry.link, `${path}.link`, 'Project link'),
      description: field(entry.description, `${path}.description`, 'Description', 400),
    })),
    skills: words(body.skills, 'skills', 'skills', LIMITS.skills, 40),
    certifications: words(body.certifications, 'certifications', 'certifications', LIMITS.certifications, 100),
  };
  if (content.personal.email && !EMAIL_REGEX.test(content.personal.email)) {
    errors.push({ field: 'personal.email', message: 'Enter a valid email address.' });
  }
  return { content, errors };
}

// What is still needed before a PDF can be made. An empty list means the resume is ready.
export function checkReadiness(resume) {
  const missing = [];
  const { personal, summary, education, experience, projects, skills } = resume;
  if (!personal.fullName) missing.push('Full name');
  if (!personal.email) missing.push('Email');
  if (!personal.phone) missing.push('Phone');
  if (summary.length < SUMMARY_MIN) missing.push(`A summary of at least ${SUMMARY_MIN} characters`);
  if (education.length === 0) missing.push('At least one education entry');
  education.forEach((entry, i) => {
    if (!entry.institution || !entry.degree) missing.push(`Education ${i + 1}: institution and degree`);
  });
  experience.forEach((entry, i) => {
    if (!entry.company || !entry.role) missing.push(`Experience ${i + 1}: company and role`);
  });
  projects.forEach((entry, i) => {
    if (!entry.name) missing.push(`Project ${i + 1}: a name`);
  });
  if (skills.length === 0) missing.push('At least one skill');

  // Sections with characters the PDF cannot print.
  const sections = {
    'Personal details': Object.values(personal),
    Summary: [summary],
    Education: education.flatMap(Object.values),
    Experience: experience.flatMap(Object.values),
    Projects: projects.flatMap(Object.values),
    Skills: skills,
    Certifications: resume.certifications,
  };
  const unprintable = Object.entries(sections)
    .filter(([, values]) => values.some((value) => value && !PRINTABLE.test(value)))
    .map(([name]) => name);
  if (unprintable.length > 0) {
    missing.push(`English (Latin) letters only, for the PDF. Remove other characters (such as ₹, Hindi or emoji) from: ${unprintable.join(', ')}`);
  }
  return { ready: missing.length === 0, missing };
}
