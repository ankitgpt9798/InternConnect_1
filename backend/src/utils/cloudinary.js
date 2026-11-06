import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // https URLs
});

const FOLDER = 'internconnect_new/posts';

// Uploads a file kept in memory by multer. Resolves to { url, publicId, type }.
export function uploadMedia(file) {
  const type = file.mimetype.startsWith('video/') ? 'video' : 'image';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: FOLDER, resource_type: type }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id, type });
    });
    stream.end(file.buffer);
  });
}

export function deleteMedia(media) {
  return cloudinary.uploader.destroy(media.publicId, { resource_type: media.type });
}
