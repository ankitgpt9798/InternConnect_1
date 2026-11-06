import mongoose from 'mongoose';

export const COVER_LETTER_MIN = 50;
export const COVER_LETTER_MAX = 1000;

// A student's application to an internship.
const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    internship: { type: mongoose.Schema.Types.ObjectId, ref: 'Internship', required: true },
    coverLetter: { type: String, required: true, trim: true, maxlength: COVER_LETTER_MAX },
  },
  { timestamps: true },
);

// A student can apply to each internship only once.
applicationSchema.index({ user: 1, internship: 1 }, { unique: true });
// Used to count a student's applications in the current month (see the plan quotas).
applicationSchema.index({ user: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
