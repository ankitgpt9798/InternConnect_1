import mongoose from 'mongoose';
import GeneratedResume from '../models/GeneratedResume.js';
import Payment from '../models/Payment.js';
import Resume from '../models/Resume.js';
import { maskEmail } from '../utils/mask.js';
import { createOtp, deleteOtp, OTP_MINUTES, OTP_RESEND_SECONDS, otpErrorMessage, secondsUntilResend, verifyOtp } from '../utils/otp.js';
import { createOrder } from '../utils/razorpay.js';
import { checkReadiness, cleanResume } from '../utils/resumeContent.js';
import { writeResumePdf } from '../utils/resumePdf.js';
import { sendEmail } from '../utils/sendEmail.js';

export const RESUME_PRICE_PAISE = 50_00; // ₹50 per resume PDF
const OTP_PURPOSE = 'resume';

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

// The saved draft, but only if it is complete. Sends the error response itself and returns null otherwise.
async function readyDraft(req, res) {
  const resume = await Resume.findOne({ user: req.user._id }).lean();
  if (!resume) {
    res.status(400).json({ message: 'Save your resume first.' });
    return null;
  }
  const readiness = checkReadiness(resume);
  if (!readiness.ready) {
    res.status(400).json({ message: 'Your resume is not ready for the PDF yet.', missing: readiness.missing });
    return null;
  }
  return resume;
}

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

// POST /api/resumes/me/otp - step 1 of the premium PDF: emails a code to the student's registered address
export async function sendResumeOtp(req, res) {
  if (!(await readyDraft(req, res))) return;

  const wait = await secondsUntilResend(req.user._id, OTP_PURPOSE);
  if (wait > 0) {
    return res.status(429).json({ message: `Please wait ${wait} seconds before asking for a new code.`, retryAfterSeconds: wait });
  }

  const code = await createOtp(req.user._id, OTP_PURPOSE);
  try {
    await sendEmail({
      to: req.user.email,
      subject: 'Your InternConnect resume payment code',
      text: `Your code to confirm the ₹50 premium resume PDF is ${code}. It expires in ${OTP_MINUTES} minutes. If you did not ask for it, you can ignore this email.`,
    });
  } catch (error) {
    console.error('The resume code could not be sent:', error.message);
    await deleteOtp(req.user._id, OTP_PURPOSE);
    return res.status(502).json({ message: 'The code could not be sent. Please try again.' });
  }

  const destination = maskEmail(req.user.email);
  res.json({
    message: `We sent a 6-digit code to ${destination}.`,
    destination,
    expiresInMinutes: OTP_MINUTES,
    resendAfterSeconds: OTP_RESEND_SECONDS,
  });
}

// POST /api/resumes/me/otp/verify  { otp } - step 2: with the right code, creates the ₹50 Razorpay order.
// This is the only way to create a resume order, so the email code cannot be skipped. There is no time window.
export async function verifyResumeOtp(req, res) {
  const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter the 6-digit code.' });

  const resume = await readyDraft(req, res);
  if (!resume) return;

  const result = await verifyOtp(req.user._id, OTP_PURPOSE, otp);
  if (!result.ok) return res.status(400).json({ message: otpErrorMessage(result), attemptsLeft: result.attemptsLeft });

  let order;
  try {
    order = await createOrder({ amountPaise: RESUME_PRICE_PAISE, receipt: `resume_${Date.now()}`, notes: { userId: String(req.user._id), purpose: 'resume' } });
  } catch (error) {
    console.error('Razorpay order failed:', error?.error?.description ?? error.message);
    return res.status(502).json({ message: 'The payment could not be started. Please ask for a new code and try again.' });
  }

  // The PDF will show the resume exactly as it is now, even if the draft is edited later.
  const content = resumeResponse(resume);
  delete content.updatedAt; // not part of the PDF
  await Payment.create({
    user: req.user._id,
    purpose: 'resume',
    amountPaise: RESUME_PRICE_PAISE,
    razorpayOrderId: order.id,
    resumeContent: content,
  });

  res.status(201).json({
    checkout: {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'InternConnect',
      description: 'Premium resume PDF',
      prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone },
    },
  });
}

// GET /api/resumes/generated - the student's paid resume PDFs, newest first
export async function getGeneratedResumes(req, res) {
  const resumes = await GeneratedResume.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({
    resumes: resumes.map((resume) => ({
      id: resume._id,
      fullName: resume.content.personal.fullName,
      createdAt: resume.createdAt,
      onProfile: req.user.resume ? req.user.resume.equals(resume._id) : false,
    })),
  });
}

// GET /api/resumes/generated/:id/pdf - downloads a paid PDF (only its owner; downloading again is free)
export async function downloadGeneratedResume(req, res) {
  const notFound = () => res.status(404).json({ message: 'Resume PDF not found.' });
  if (!mongoose.isValidObjectId(req.params.id)) return notFound();
  const resume = await GeneratedResume.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!resume) return notFound();

  const fileName = `${resume.content.personal.fullName.replace(/[^A-Za-z0-9]+/g, '-')}-Resume.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  writeResumePdf(resume.content, res);
}
