// adminController.js
const db = require('../database/database'); // ✅ fix the typo (was '../dabase/database')
const Request = require('../models/requestModel'); // ✅ add this — needed for getStatistics

exports.getAllRequests = async (req, res) => {
    try {
       const sql = `
    SELECT 
        sr.request_id,
        u.name AS customer_name,
        u.phone AS customer_phone,
        sr.service_type,
        sr.vehicle_type,
        sr.address AS location,
        sr.status,
        sr.created_at,
        sr.license_plate
    FROM service_requests sr
    JOIN users u ON sr.user_id = u.user_id
    ORDER BY sr.created_at DESC 
    `;
        const [rows] = await db.query(sql);
        res.json({ requests: rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const totalRequests = await Request.countAll();
        const activeRequests = await Request.countByStatus('active');
        const pendingRequests = await Request.countByStatus('pending');

        res.json({
            totalRequests,
            activeRequests,
            pendingRequests
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};