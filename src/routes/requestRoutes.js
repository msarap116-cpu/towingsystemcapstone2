
// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticateToken = require('../middleware/authMiddleware');
const Request = require('../models/requestModel');
const db = require('../database/database'); 

// Add at the very TOP of requestRoutes.js after the requires
router.use((req, res, next) => {
    console.log('requestRoutes hit:', req.method, req.path);
    next();
});
//Static/specific routes FIRST
router.post('/', authenticateToken, requestController.createRequest);
router.get('/my-requests', authenticateToken, requestController.getMyRequests);
router.get('/', authenticateToken, requestController.getAllRequests);
router.put('/:id/status', authenticateToken, requestController.updateStatus);
router.put('/:id/address', authenticateToken, requestController.updateAddress);

router.get('/latest', authenticateToken, async (req, res) => {
    const user_id = req.user.id ?? req.user.user_id;
    const role = req.user.role;

    try {
        let result;
        if (role === 'driver') {
            result = await Request.getLatestPendingForDriver();
        } else {
            result = await Request.getLatestByUser(user_id);
        }

        if (!result || !result.request_id) {
            return res.status(404).json({ message: 'No requests found' });
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Database query failed: ' + err.message });
    }
});
// requestRoutes.js — add this BEFORE module.exports, AFTER /latest
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const rows = await db.query(`
            SELECT 
                sr.request_id,
                u.name        AS customer_name,
                u.phone       AS customer_phone,
                st.name       AS service_type,
                v.vehicle_type,
                v.license_plate,
                sr.address    AS location,
                sr.status,
                sr.created_at
            FROM service_requests sr
            LEFT JOIN users u          ON sr.user_id         = u.user_id
            LEFT JOIN service_types st ON sr.service_type_id = st.service_type_id
            LEFT JOIN vehicles v       ON sr.vehicle_id      = v.vehicle_id
            WHERE sr.request_id = ?
        `, [id]);

        console.log('GET /:id rows:', rows); // debug

        if (!rows || !rows[0]) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('GET /:id error:', err.message); // this shows in Render logs
        res.status(500).json({ error: 'Failed to fetch request: ' + err.message });
    }
});
router.post('/driver-location', authenticateToken, async (req, res) => {
    const { lat, lng, request_id } = req.body;
    const driver_id = req.user.id ?? req.user.user_id;

    if (!lat || !lng || !request_id) {
        return res.status(400).json({ error: 'lat, lng, and request_id are required' });
    }

    try {
        await Request.updateDriverLocation(request_id, driver_id, lat, lng);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save location: ' + err.message });
    }
});

// // Dynamic /:id route LAST — so it doesn't swallow /latest or /my-requests
// router.get('/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const request = await Request.findById(id); // make sure this method exists in your model

//         if (!request) {
//             return res.status(404).json({ success: false, message: 'Request not found' });
//         }

//         res.json({ success: true, data: request });
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch request: ' + err.message });
//     }
// });
// // GET single request by ID — for viewRequest() and editRequest()
// router.get('/:id', authenticateToken, async (req, res) => {
//     try {
//         const { id } = req.params;
//         const request = await Request.findById(id);

//         if (!request) {
//             return res.status(404).json({ message: 'Request not found' });
//         }

//         res.json(request); // your frontend accesses request.request_id, request.customer_name etc. directly
//     } catch (err) {
//         res.status(500).json({ error: 'Failed to fetch request: ' + err.message });
//     }
// });

// DELETE request by ID — for confirmDelete()
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Request.deleteById(id);
        res.json({ success: true, message: `Request #${id} deleted` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete request: ' + err.message });
    }
});
// PUT /api/requests/:id — full update for editRequest/saveRequest
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_name, customer_phone, service_type, location, status } = req.body;

        const rows = await db.query(`
            SELECT sr.request_id, sr.user_id 
            FROM service_requests sr
            WHERE sr.request_id = ?
        `, [id]);

        if (!rows || !rows[0]) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // Update user info
        await db.query(`
            UPDATE users u
            JOIN service_requests sr ON sr.user_id = u.user_id
            SET u.name = ?, u.phone = ?
            WHERE sr.request_id = ?
        `, [customer_name, customer_phone, id]);

        // Update request — resolve service_type name to ID
        await db.query(`
            UPDATE service_requests
            SET service_type_id = (
                SELECT service_type_id FROM service_types 
                WHERE name = ? LIMIT 1
            ),
            address = ?, 
            status = ?, 
            updated_at = NOW()
            WHERE request_id = ?
        `, [service_type, location, status, id]);

        res.json({ success: true, message: `Request #${id} updated` });

    } catch (err) {
        console.error('PUT /:id error:', err.message);
        res.status(500).json({ error: 'Failed to update request: ' + err.message });
    }
});

module.exports = router;