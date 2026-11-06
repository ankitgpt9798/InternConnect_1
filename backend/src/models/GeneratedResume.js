import mongoose from 'mongoose';

// A paid resume PDF. It keeps a copy of the resume as it was when the email code was verified, so editing the draft
// later does not change it. The PDF itself is drawn from this copy whenever it is downloaded.
const generatedResumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    content: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

generatedResumeSchema.index({ user: 1, createdAt: -1 });

const GeneratedResume = mongoose.model('GeneratedResume', generatedResumeSchema);

export default GeneratedResume;
