import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  { institution: String, degree: String, startYear: String, endYear: String, score: String },
  { _id: false },
);
const experienceSchema = new mongoose.Schema(
  { company: String, role: String, startDate: String, endDate: String, description: String },
  { _id: false },
);
const projectSchema = new mongoose.Schema({ name: String, link: String, description: String }, { _id: false });

// The resume a student is writing (one draft per student). The rules for each field are in utils/resumeContent.js.
// Paid PDFs are made from a copy of this content (see GeneratedResume), so later edits do not change them.
const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    personal: {
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      link: { type: String, default: '' }, // LinkedIn or portfolio
    },
    summary: { type: String, default: '' },
    education: [educationSchema],
    experience: [experienceSchema], // jobs and internships
    projects: [projectSchema],
    skills: [String],
    certifications: [String],
  },
  { timestamps: true },
);

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;
