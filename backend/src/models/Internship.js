import mongoose from 'mongoose';

export const WORK_MODES = ['remote', 'office', 'hybrid'];
// The fields of work students can filter by. The frontend shows them translated (internships.categories.*).
export const INTERNSHIP_CATEGORIES = [
  'software_development',
  'web_development',
  'data_science',
  'design',
  'marketing',
  'content_writing',
  'finance',
  'human_resources',
];
export const ENGAGEMENTS = ['full_time', 'part_time'];

// An internship listing. There is no employer portal in this project, so listings come from the seed script.
const internshipSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true }, // "Remote" for remote internships
    workMode: { type: String, enum: WORK_MODES, required: true },
    category: { type: String, enum: INTERNSHIP_CATEGORIES, required: true },
    engagement: { type: String, enum: ENGAGEMENTS, default: 'full_time' }, // full time or part time
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
