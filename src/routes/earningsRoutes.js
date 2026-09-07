// routes/earningsRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/database');
const authenticateToken = require('../middleware/authMiddleware');

// GET /api/earnings/summary
router.get('/summary', authenticateToken, async (req, res) => {
    const driver_id = req.user.id;

    try {
        const signedAmount = `CASE WHEN type = 'penalty' THEN -amount ELSE amount END`;

        const [todayRow] = await db.query(
            `SELECT COALESCE(SUM(${signedAmount}), 0) AS total
             FROM driver_earnings
             WHERE driver_id = ? AND DATE(created_at) = CURDATE()`,
            [driver_id]
        );

        const [weekRow] = await db.query(
            `SELECT COALESCE(SUM(${signedAmount}), 0) AS total
             FROM driver_earnings
             WHERE driver_id = ? AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)`,
            [driver_id]
        );

        const [allTimeRow] = await db.query(
            `SELECT COALESCE(SUM(${signedAmount}), 0) AS total
             FROM driver_earnings
             WHERE driver_id = ?`,
            [driver_id]
        );

        res.json({
            today: Number(todayRow.total),
            thisWeek: Number(weekRow.total),
            allTime: Number(allTimeRow.total)
        });
    } catch (err) {
        console.error('Error fetching earnings summary:', err);
        res.status(500).json({ error: 'Failed to fetch earnings summary' });
    }
});

// GET /api/earnings/history
router.get('/history', authenticateToken, async (req, res) => {
    const driver_id = req.user.id;

    try {
        const rows = await db.query(
            `SELECT de.earning_id, de.amount, de.type, de.description, de.created_at,
                    sr.address, sr.completed_at
             FROM driver_earnings de
             LEFT JOIN service_requests sr ON de.request_id = sr.request_id
             WHERE de.driver_id = ?
             ORDER BY de.created_at DESC
             LIMIT 50`,
            [driver_id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching earnings history:', err);
        res.status(500).json({ error: 'Failed to fetch earnings history' });
    }
});

module.exports = router;