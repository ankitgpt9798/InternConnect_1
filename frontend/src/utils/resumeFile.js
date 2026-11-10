// Resumes sent with internship applications: PDF only, up to 2 MB (the same rules as the backend,
// backend/src/models/ApplicationResume.js). The server checks the file again, including its contents.
export const RESUME_MAX_BYTES = 2 * 1024 * 1024;

// "240 KB", "1.6 MB"
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// A problem with the chosen file, or '' if it can be sent.
export function resumeFileProblem(file) {
  if (!file) return 'Attach your resume as a PDF.';
  const isPdf = file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name));
  if (!isPdf) return 'Your resume must be a PDF file.';
  if (file.size > RESUME_MAX_BYTES) return 'Your resume PDF can be up to 2 MB.';
  if (file.size === 0) return 'This file is empty. Choose your resume PDF.';
  return '';
}
