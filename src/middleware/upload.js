// middleware/upload.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/payment_proofs/');
    },
    filename: (req, file, cb) => {

    const uniqueName =
        `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.body.request_id}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
}
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG/PNG images allowed'));
        }
    }
});

module.exports = upload;