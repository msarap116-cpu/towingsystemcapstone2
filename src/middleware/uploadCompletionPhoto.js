// src/middleware/uploadCompletionPhoto.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = 'uploads/completion_photos/';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.params.requestId}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  }
});

module.exports = uploadCompletionPhoto;