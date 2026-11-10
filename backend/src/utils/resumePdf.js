import { PassThrough } from 'node:stream';
import PDFDocument from 'pdfkit';

// One ATS-friendly template: a single column of real text in reading order, built-in fonts, no images or tables,
// so applicant tracking systems can read every word.
const COLORS = { text: '#0f172a', muted: '#475569', accent: '#1d5fd8', rule: '#cbd5e1' };
const MARGIN = 50;

// Writes the resume `content` as a PDF into `output` (an HTTP response or any writable stream).
export function writeResumePdf(content, output) {
  const { personal, summary, education, experience, projects, skills, certifications } = content;
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    info: { Title: `${personal.fullName} - Resume`, Author: personal.fullName, Creator: 'InternConnect' },
  });
  doc.pipe(output);
  const width = doc.page.width - MARGIN * 2;

  const body = (text, options = {}) => doc.font('Helvetica').fontSize(10.5).fillColor(COLORS.text).text(text, options);
  const muted = (text) => doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted).text(text);
  const bold = (text) => doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.text).text(text);
  const heading = (title) => {
    doc.moveDown(0.9);
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLORS.accent).text(title.toUpperCase(), { characterSpacing: 0.5 });
    const y = doc.y + 2;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).lineWidth(0.7).strokeColor(COLORS.rule).stroke();
    doc.moveDown(0.5);
  };
  const dates = (start, end) => [start, end].filter(Boolean).join(' – ');

  // Name and contact line
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.text).text(personal.fullName);
  doc.moveDown(0.2);
  muted([personal.email, personal.phone, personal.location, personal.link].filter(Boolean).join('   |   '));

  heading('Summary');
  body(summary, { lineGap: 2 });

  heading('Education');
  education.forEach((entry, index) => {
    if (index > 0) doc.moveDown(0.5);
    bold(`${entry.degree}, ${entry.institution}`);
    muted([dates(entry.startYear, entry.endYear), entry.score].filter(Boolean).join('   ·   '));
  });

  if (experience.length > 0) {
    heading('Experience');
    experience.forEach((entry, index) => {
      if (index > 0) doc.moveDown(0.6);
      bold(`${entry.role}, ${entry.company}`);
      if (entry.startDate || entry.endDate) muted(dates(entry.startDate, entry.endDate));
      if (entry.description) body(entry.description, { lineGap: 2 });
    });
  }

  if (projects.length > 0) {
    heading('Projects');
    projects.forEach((entry, index) => {
      if (index > 0) doc.moveDown(0.6);
      bold(entry.name);
      if (entry.link) muted(entry.link);
      if (entry.description) body(entry.description, { lineGap: 2 });
    });
  }

  heading('Skills');
  body(skills.join(', '));

  if (certifications.length > 0) {
    heading('Certifications');
    certifications.forEach((name) => body(`•  ${name}`));
  }

  doc.end();
}

// The same PDF as bytes (for a copy kept with an internship application).
export function resumePdfBuffer(content) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const output = new PassThrough();
    output.on('data', (chunk) => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
    writeResumePdf(content, output);
  });
}
