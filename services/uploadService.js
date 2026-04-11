const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

class UploadService {
  async uploadPhoto(buffer, originalName) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { 
            folder: 'estate-contractor', 
            public_id: `photo_${Date.now()}`,
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary error details:', error);
              reject(error);
            } else {
              console.log('Upload successful:', result.secure_url);
              resolve(result);
            }
          }
        ).end(buffer);
      });
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      console.error('Full upload error:', error);
      throw new Error(`Photo upload failed: ${error.message}`);
    }
  }
}

module.exports = { UploadService: new UploadService(), upload };