// src/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

const makeUploader = ({ folder, maxSizeMB = 5, publicIdFn }) =>
  multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => ({
        folder,
        resource_type: 'image',
        public_id: publicIdFn
          ? publicIdFn(req, file)
          : `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      }),
    }),
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
      }
      cb(null, true);
    },
  });

module.exports = {
  cloudinary,
  uploadProof: makeUploader({
    folder: 'towing/payment_proofs',
    maxSizeMB: 5,
  }),
  uploadCompletion: makeUploader({
    folder: 'towing/completion_photos',
    maxSizeMB: 8,
    publicIdFn: (req) =>
      `${Date.now()}-${req.params.requestId || req.user?.id || Math.round(Math.random() * 1e9)}`,
  }),
  uploadProfilePicture: makeUploader({
    folder: 'towing/profile_pictures',
    maxSizeMB: 5,
    publicIdFn: (req) => `${req.user.id}-${Date.now()}`,
  }),
};