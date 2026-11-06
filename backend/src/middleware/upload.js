import multer from 'multer';

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
