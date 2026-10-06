const express = require('express');
const db = require('../database/database');
const { cloudinary } = require('../config/cloudinary');
const multer = require('multer');
const router = express.Router();

// Simple in-memory upload, then push to Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new Error('Only PNG/JPG/WEBP allowed'), ok);
    }
});

// GET current QR
router.get('/gcash-qr', async (req, res) => {
    try {
        const rows = await db.query(
            "SELECT setting_value FROM settings WHERE setting_key = 'gcash_qr_path' LIMIT 1"
        );
        res.json({
            success: true,
            image_path: rows[0]?.setting_value || null
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST new QR → upload to Cloudinary, save URL in DB
router.post('/gcash-qr', upload.single('gcash_qr'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const uploaded = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'towing/gcash_qr',
                    public_id: 'gcash_qr',         // fixed name → overwrites previous
                    overwrite: true,
                    invalidate: true,
                    resource_type: 'image',
                },
                (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(req.file.buffer);
        });

        // Optional: delete old QR if it was a different public_id
        const rows = await db.query(
            "SELECT setting_value FROM settings WHERE setting_key = 'gcash_qr_path' LIMIT 1"
        );
        const oldUrl = rows[0]?.setting_value;
        if (oldUrl && oldUrl.startsWith('http') && oldUrl !== uploaded.secure_url) {
            // can't easily extract public_id here — skip; overwrite:true already replaces same-name
        }

        await db.query(
            `INSERT INTO settings (setting_key, setting_value)
             VALUES ('gcash_qr_path', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [uploaded.secure_url]
        );

        res.json({ success: true, image_path: uploaded.secure_url });
    } catch (err) {
        console.error('Cloudinary QR upload error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;