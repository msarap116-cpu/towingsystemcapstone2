// routes/driver.js
const express = require('express');
const router = express.Router();
const db = require('../database/database');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/location', authenticateToken, async (req, res) => {
    const { lat, lng, request_id } = req.body;
    const driver_id = req.user.id;

    if (!lat || !lng || !request_id) {
        return res.status(400).json({ error: 'lat, lng, and request_id are required' });
    }

    try {

        await db.query(
            `UPDATE service_requests
             SET driver_id = ?, status = 'in progress'
             WHERE request_id = ?`,
            [driver_id, request_id]
        );


        await db.query(
            `INSERT INTO driver_locations (driver_id, lat, lng)
             VALUES (?, ?, ?)`,
            [driver_id, lat, lng]
        );

        res.json({ success: true });

    } catch (err) {
        console.error('Error saving driver location:', err);
        res.status(500).json({ error: 'Failed to save location' });
    }
});


router.get('/requests/latest', authenticateToken, async (req, res) => {
    const user_id = req.user.id;

    try {
        const [rows] = await db.query(
            `SELECT sr.request_id,
                    sr.location_lat,
                    sr.location_lng,
                    sr.address,
                    sr.status,
                    dl.lat AS driver_lat,
                    dl.lng AS driver_lng,
                    dl.recorded_at
             FROM service_requests sr
             LEFT JOIN driver_locations dl
                    ON dl.driver_id = sr.driver_id
             WHERE sr.user_id = ?
               AND sr.status IN ('pending', 'assigned', 'in progress')
             ORDER BY sr.created_at DESC
             LIMIT 1`,
            [user_id]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'No active request found' });
        }

        res.json(rows[0]);

    } catch (err) {
        console.error('Error fetching request:', err);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

module.exports = router;