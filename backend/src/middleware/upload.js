import multer from 'multer';
import { RESUME_MAX_BYTES } from '../models/ApplicationResume.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MB = 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * MB;
const MAX_VIDEO_BYTES = 30 * MB;

const TYPE_MESSAGE = 'Only JPEG, PNG, WebP or GIF photos and MP4, WebM or MOV videos can be uploaded.';
const SIZE_MESSAGE = 'The file is too large. Photos can be up to 5 MB and videos up to 30 MB.';

// Files are kept in memory only until they are sent to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter(req, file, cb) {
    if (IMAGE_TYPES.includes(file.mimetype) || VIDEO_TYPES.includes(file.mimetype)) return cb(null, true);
    const error = new Error(TYPE_MESSAGE);
    error.statusCode = 400;
    cb(error);
  },
});

// Internship applications: one resume PDF of up to 2 MB, kept in memory until it is checked and saved privately in the
// database (see models/ApplicationResume.js). The controller also checks the file's contents, not just its type.
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: RESUME_MAX_BYTES, files: 1, fields: 5, fieldSize: 8 * 1024 },
  fileFilter(req, file, cb) {
    if (['application/pdf', 'application/x-pdf'].includes(file.mimetype)) return cb(null, true);
    const error = new Error('Your resume must be a PDF file.');
    error.statusCode = 400;
    error.code = 'RESUME_NOT_PDF';
    cb(error);
  },
});

// Reads an application sent as a form: the cover letter and at most one file in the "resume" field. Requests sent as
// JSON (using the InternConnect resume instead of a file) pass straight through.
export function uploadApplicationResume(req, res, next) {
  resumeUpload.single('resume')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ code: 'RESUME_TOO_LARGE', message: 'Your resume PDF can be up to 2 MB.' });
      if (error.code === 'LIMIT_FIELD_VALUE') return res.status(400).json({ message: 'The cover letter is too long.' });
      return res.status(400).json({ message: 'Attach one resume PDF in the "resume" field.' });
    }
    if (error?.statusCode === 400) return res.status(400).json({ code: error.code, message: error.message });
    if (error) return next(error);
    next();
  });
}

// Accepts at most one file in the "media" field and answers 400 with a clear message for bad files.
export function uploadPostMedia(req, res, next) {
  upload.single('media')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: SIZE_MESSAGE });
      return res.status(400).json({ message: 'Attach one photo or video in the "media" field.' });
    }
    if (error?.statusCode === 400) return res.status(400).json({ message: error.message });
    if (error) return next(error);

    // Videos may be up to 30 MB, photos only up to 5 MB.
    if (req.file && IMAGE_TYPES.includes(req.file.mimetype) && req.file.size > MAX_IMAGE_BYTES) {
      return res.status(400).json({ message: SIZE_MESSAGE });
    }
    next();
  });
}
