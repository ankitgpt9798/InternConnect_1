import mongoose from 'mongoose';

export const WORK_MODES = ['remote', 'office', 'hybrid'];

// An internship listing. There is no employer portal in this project, so listings come from the seed script.
const internshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true }, // "Remote" for remote internships
    workMode: { type: String, enum: WORK_MODES, required: true },
    stipend: {
      min: { type: Number, required: true, min: 0 }, // rupees per month
      max: { type: Number, required: true, min: 0 },
    },
    durationMonths: { type: Number, required: true, min: 1 },
    skills: [String],
    description: { type: String, required: true },
    applyBy: { type: Date, required: true }, // applications close at this moment
  },
  { timestamps: true },
);

internshipSchema.index({ title: 1, company: 1 }, { unique: true });

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;
