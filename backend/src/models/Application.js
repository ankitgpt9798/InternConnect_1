import mongoose from 'mongoose';
import { RESUME_SOURCES } from './ApplicationResume.js';

export const COVER_LETTER_MIN = 50;
export const COVER_LETTER_MAX = 1000;

// The resume sent with the application. The PDF itself is in ApplicationResume, so listing applications never loads
// the files.
const resumeInfoSchema = new mongoose.Schema(
  {
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'ApplicationResume', required: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    source: { type: String, enum: RESUME_SOURCES, required: true },
  },
  { _id: false },
);

// A student's application to an internship.
const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    coverLetter: { type: String, required: true, trim: true, maxlength: COVER_LETTER_MAX },
    // Every new application has one; applications sent before resumes were required have none (null).
    resume: { type: resumeInfoSchema, default: null },
  },
  { timestamps: true },
);

// A student can apply to each internship only once.
applicationSchema.index({ user: 1, internship: 1 }, { unique: true });
// Used to count a student's applications in the current month (see the plan quotas).
applicationSchema.index({ user: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
