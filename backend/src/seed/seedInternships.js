// Loads sample internship listings into the database: npm run seed:internships (from the backend folder).
// The companies are fictional (see sampleInternships.js). Running it again refreshes the deadlines, categories and
// other details without creating duplicates.
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Internship from '../models/Internship.js';
import { SAMPLE_INTERNSHIPS } from './sampleInternships.js';

const DAY_MS = 24 * 60 * 60 * 1000;

await connectDB();
const database = mongoose.connection.name;
console.log(`Target database: ${database}`);

// Production data is only added on purpose: a production database (name containing "prod", or NODE_ENV=production)
// needs the database name repeated on the command line, e.g.
//   npm run seed:internships -- --confirm-production=internconnect_prod
const isProductionTarget = /prod/i.test(database) || process.env.NODE_ENV === 'production';
const confirmed = process.argv.includes(`--confirm-production=${database}`);
if (isProductionTarget && !confirmed) {
  console.error(`"${database}" is a production database, so nothing was added. To add the sample listings on purpose, run:`);
  console.error(`  npm run seed:internships -- --confirm-production=${database}`);
  await mongoose.disconnect();
  process.exit(1);
}

const now = Date.now();
let created = 0;
let updated = 0;
for (const { applyInDays, ...sample } of SAMPLE_INTERNSHIPS) {
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
