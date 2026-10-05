const express = require('express');
const multer = require('multer');
const db = require('../database/database');
const router = express.Router();

// Memory storage — no files written to disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/jpg'].includes(file.mimetype);
        cb(ok ? null : new Error('Only PNG/JPG allowed'), ok);
    }
});

// GET current QR (may be a data: URI OR a /uploads path)
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

// POST new QR → save as data URI in DB
router.post('/gcash-qr', upload.single('gcash_qr'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        await db.query(
            `INSERT INTO settings (setting_key, setting_value)
             VALUES ('gcash_qr_path', ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [dataUri]
        );

        res.json({ success: true, image_path: dataUri });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;