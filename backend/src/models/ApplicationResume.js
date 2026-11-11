import mongoose from 'mongoose';

export const RESUME_MAX_BYTES = 2 * 1024 * 1024; // uploaded resumes: PDF, up to 2 MB
export const RESUME_SOURCES = ['upload', 'internconnect']; // uploaded by the student, or their InternConnect resume PDF

// The resume PDF sent with one application, kept privately in the database: it is never given a public link, and only
// the student who applied can download it (GET /api/applications/:id/resume). Each application keeps its own copy, so
// a later resume does not change applications that were already sent.
const applicationResumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 1 },
    source: { type: String, enum: RESUME_SOURCES, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

const ApplicationResume = mongoose.model('ApplicationResume', applicationResumeSchema);

export default ApplicationResume;
