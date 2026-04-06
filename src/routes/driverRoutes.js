// routes/driver.js
const express = require('express');
const router = express.Router();
const db = require('../database/database'); // adjust to your DB connection
const authenticateToken = require('../middleware/authMiddleware'); // your JWT middleware

/**
 * POST /driver/location
 * Driver browser sends their GPS coords every few seconds
 * Body: { lat, lng, request_id }
 */
router.post('/location', authenticateToken, async (req, res) => {
    const { lat, lng, request_id } = req.body;
    const driver_id = req.user.id; // from JWT

    if (!lat || !lng || !request_id) {
        return res.status(400).json({ error: 'lat, lng, and request_id are required' });
    }

    try {
        // Update the requests table with driver's current location
        await db.query(
            `UPDATE requests SET driver_lat = ?, driver_lng = ?, driver_id = ? WHERE id = ?`,
            [lat, lng, driver_id, request_id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error saving driver location:', err);
        res.status(500).json({ error: 'Failed to save location' });
    }
});

/**
 * GET /requests/latest
 * Returns customer location + driver location for the active request
 * Already exists in your app — extend it to also return driver coords
 */
router.get('/requests/latest', authenticateToken, async (req, res) => {
    const user_id = req.user.id;

    try {
        const [rows] = await db.query(
            `SELECT id, location_lat, location_lng, address, status,
                    driver_lat, driver_lng
             FROM requests
             WHERE user_id = ? AND status = 'pending'
             ORDER BY created_at DESC LIMIT 1`,
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