// Loads sample internship listings into the database: npm run seed:internships (from the backend folder).
// The companies are fictional. Running it again refreshes the deadlines without creating duplicates.
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Internship from '../models/Internship.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const SAMPLES = [
  {
    title: 'Frontend Developer Intern',
    company: 'Nimbus Clinic Labs',
    location: 'Bengaluru',
    workMode: 'hybrid',
    stipend: { min: 15000, max: 20000 },
    durationMonths: 6,
    skills: ['React', 'JavaScript', 'HTML', 'CSS'],
    description:
      'Join the product team that builds the booking and patient dashboard used by more than 400 clinics. You will turn designs into accessible React screens and ship them with the team every week.',
    applyInDays: 20,
  },
  {
    title: 'Backend Developer Intern (Node.js)',
    company: 'Orbit Ledger Fintech',
    location: 'Pune',
    workMode: 'office',
    stipend: { min: 20000, max: 25000 },
    durationMonths: 6,
    skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs'],
    description:
      'Work with the payments team on the APIs that record transactions and settlements. You will learn how money moves safely through a system and why every request has to be checked.',
    applyInDays: 14,
  },
  {
    title: 'Data Science Intern',
    company: 'Indus Pulse Analytics',
    location: 'Remote',
    workMode: 'remote',
    stipend: { min: 12000, max: 15000 },
    durationMonths: 4,
    skills: ['Python', 'Pandas', 'SQL', 'Machine Learning'],
    description:
      'Help the analytics team clean hospital admission data and build models that forecast weekly demand for beds. Your work feeds the dashboards partner hospitals use every morning.',
    applyInDays: 25,
  },
  {
    title: 'UI/UX Design Intern',
    company: 'Pixel & Pine Studio',
    location: 'Mumbai',
    workMode: 'office',
    stipend: { min: 10000, max: 12000 },
    durationMonths: 3,
    skills: ['Figma', 'User Research', 'Wireframing', 'Prototyping'],
    description:
      'Design screens for a learning app used by school students in three languages. You will run short user interviews, sketch flows and turn them into tested Figma prototypes.',
    applyInDays: 10,
  },
  {
    title: 'Digital Marketing Intern',
    company: 'Saffron Loom Retail',
    location: 'Remote',
    workMode: 'remote',
    stipend: { min: 5000, max: 8000 },
    durationMonths: 3,
    skills: ['Social Media Marketing', 'SEO', 'Canva', 'Google Analytics'],
    description:
      'Plan and run social media campaigns that introduce artisans and their handmade products. You will see how each post performs and learn to adjust campaigns using real numbers.',
    applyInDays: 12,
  },
  {
    title: 'Content Writing Intern',
    company: 'Monsoon Notes Media',
    location: 'Remote',
    workMode: 'remote',
    stipend: { min: 4000, max: 6000 },
    durationMonths: 2,
    skills: ['Content Writing', 'Research', 'English', 'SEO'],
    description:
      'Write clear, well-researched articles that help students choose courses, prepare for interviews and manage their first salary. Every article is edited with you.',
    applyInDays: 18,
  },
  {
    title: 'Finance and Accounts Intern',
    company: 'Lotus Lane Wealth',
    location: 'Delhi',
    workMode: 'office',
    stipend: { min: 10000, max: 10000 },
    durationMonths: 6,
    skills: ['MS Excel', 'Accounting', 'Tally', 'Financial Analysis'],
    description:
      'Support the accounts team with monthly bookkeeping, GST filings and client reports. You will learn how a growing advisory firm keeps its books accurate.',
    applyInDays: 9,
  },
  {
    title: 'Human Resources Intern',
    company: 'BrightSlate EdTech',
    location: 'Hyderabad',
    workMode: 'hybrid',
    stipend: { min: 8000, max: 10000 },
    durationMonths: 3,
    skills: ['Recruitment', 'Communication', 'MS Excel'],
    description:
      'Help the people team hire trainers across five states. You will screen applications, schedule interviews and improve how new joiners are welcomed in their first week.',
    applyInDays: 16,
  },
  {
    title: 'Android Developer Intern',
    company: 'Tarang E-Rides',
    location: 'Chennai',
    workMode: 'office',
    stipend: { min: 18000, max: 22000 },
    durationMonths: 6,
    skills: ['Kotlin', 'Android', 'REST APIs', 'Git'],
    description:
      'Build features for an app that thousands of commuters use every day. You will work on maps, live ride tracking and making the app fast on low-cost phones.',
    applyInDays: 21,
  },
  {
    title: 'Full Stack Developer Intern (MERN)',
    company: 'CodeCraft Ledgerworks',
    location: 'Remote',
    workMode: 'remote',
    stipend: { min: 15000, max: 25000 },
    durationMonths: 6,
    skills: ['MongoDB', 'Express', 'React', 'Node.js'],
    description:
      'Work across the stack on a billing product used by wholesalers in 40 cities. You will build features end to end, from the database model to the React screen.',
    applyInDays: 30,
  },
  {
    title: 'Graphic Design Intern',
    company: 'Thali Box Foods',
    location: 'Ahmedabad',
    workMode: 'office',
    stipend: { min: 7000, max: 9000 },
    durationMonths: 3,
    skills: ['Adobe Illustrator', 'Photoshop', 'Packaging Design', 'Canva'],
    description:
      'Design packaging, posters and social media creatives for a growing food brand. You will see your designs on supermarket shelves within your internship.',
    applyInDays: 7,
  },
  {
    title: 'Business Analyst Intern',
    company: 'GreenFurrow Agritech',
    location: 'Noida',
    workMode: 'hybrid',
    stipend: { min: 12000, max: 14000 },
    durationMonths: 4,
    skills: ['SQL', 'MS Excel', 'Power BI', 'Data Analysis'],
    description:
      'Turn order and delivery data into dashboards that help decide where to open the next collection centre. You will work closely with the operations and product teams.',
    applyInDays: 15,
  },
];

await connectDB();
const now = Date.now();
let created = 0;
let updated = 0;
for (const { applyInDays, ...sample } of SAMPLES) {
  const result = await Internship.updateOne(
    { title: sample.title, company: sample.company },
    { $set: { ...sample, applyBy: new Date(now + applyInDays * DAY_MS) } },
    { upsert: true },
  );
  if (result.upsertedCount) created += 1;
  else updated += 1;
}
console.log(`Sample internships: ${created} added, ${updated} refreshed.`);
await mongoose.disconnect();
