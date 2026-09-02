// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticateToken = require('../middleware/authMiddleware');
const Request = require('../models/requestModel');
const db = require('../database/database');

router.use((req, res, next) => {
    // console.log('requestRoutes hit:', req.method, req.path);
    next();
});

// === Specific Routes (Order matters!) ===

// GET /latest - This MUST come before GET /:id
router.get('/latest', authenticateToken, async (req, res) => {
    const user_id = req.user.id ?? req.user.user_id;

    try {
        const result = await Request.getLatestByUser(user_id);

        // console.log("ROUTE result:", result);
        // console.log("ROUTE isArray:", Array.isArray(result));

        if (!result || result.length === 0) {
            return res.json([]);
        }

        res.json(result);

    } catch (err) {
        console.error('Error fetching latest requests:', err);

        res.status(500).json({
            error: 'Database query failed: ' + err.message
        });
    }
});

// GET /pending – all unassigned pending requests (for drivers) - This MUST come before GET /:id
router.get('/pending', authenticateToken, async (req, res) => {
    const role = req.user.role;
    if (role !== 'driver') {
        return res.status(403).json({ error: 'Only drivers can access this endpoint' });
    }

    try {
        const sql = `
            SELECT
                r.request_id,
                u.name AS customer_name,
                u.phone AS customer_phone,
                st.name AS service_type,
                v.vehicle_type,
                v.license_plate,
                r.address AS location,
                r.location_lat,
                r.location_lng,
                r.status,
                r.created_at
            FROM service_requests r
            JOIN users u ON r.user_id = u.user_id
            LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.status = 'pending' AND r.driver_id IS NULL
            ORDER BY r.created_at ASC
        `;
        const rows = await db.query(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /my-trips – all requests assigned to this driver - This MUST come before GET /:id
router.get('/my-trips', authenticateToken, async (req, res) => {
    const driver_id = req.user.id;
    try {
        const sql = `
            SELECT
                r.request_id,
                u.name AS customer_name,
                u.phone AS customer_phone,
                st.name AS service_type,
                v.vehicle_type,
                v.license_plate,
                r.address AS location,
                r.location_lat,
                r.location_lng,
                r.status,
                r.created_at
            FROM service_requests r
            JOIN users u ON r.user_id = u.user_id
            LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
            LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
            WHERE r.driver_id = ?
            ORDER BY r.created_at DESC
        `;
        const rows = await db.query(sql, [driver_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Other specific routes
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


router.post('/', authenticateToken, requestController.createRequest);
router.get('/my-requests', authenticateToken, requestController.getMyRequests);
router.get('/', authenticateToken, requestController.getAllRequests);
router.put('/:id/status', authenticateToken, requestController.updateStatus); // The one from the controller
router.put('/:id/address', authenticateToken, requestController.updateAddress);

// Accept a request (assign driver, set status = 'assigned')
router.put('/:id/accept', authenticateToken, async (req, res) => {

    const driver_id = req.user.id;
    const { id } = req.params;

    console.log('=================================');
    console.log('DRIVER ACCEPT JOB');
    console.log('Request ID:', id);
    console.log('Driver ID:', driver_id);
    console.log('=================================');

    try {

        // Get request
        const result = await db.query(
            `SELECT
                request_id,
                status,
                driver_id
             FROM service_requests
             WHERE request_id = ?`,
            [id]
        );

        console.log('Accept request query result:', result);

        // Your db.query() appears to return rows directly,
        // but this also safely handles [rows, fields].
        const rows = Array.isArray(result[0])
            ? result[0]
            : result;

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: 'Request not found'
            });
        }

        const request = rows[0];

        console.log('Request found:', request);

        // Request must still be pending
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Request is not pending. Current status: ${request.status}`
            });
        }

        // Someone else already assigned it
        if (request.driver_id !== null) {
            return res.status(400).json({
                error: 'Already assigned to a driver'
            });
        }

        // Assign this driver
        const updateResult = await db.query(
            `UPDATE service_requests
             SET
                driver_id = ?,
                status = 'assigned',
                updated_at = NOW()
             WHERE request_id = ?
             AND driver_id IS NULL
             AND status = 'pending'`,
            [driver_id, id]
        );

        console.log('Accept update result:', updateResult);

        // Check whether the update actually happened
        const affectedRows = updateResult.affectedRows;

        if (affectedRows === 0) {
            return res.status(409).json({
                error: 'Request was already accepted or assigned by another user.'
            });
        }

        console.log(
            `Driver ${driver_id} successfully accepted request ${id}`
        );

        return res.json({
            success: true,
            message: 'Request accepted',
            request_id: Number(id),
            driver_id: Number(driver_id)
        });

    } catch (err) {

        console.error('=================================');
        console.error('DRIVER ACCEPT ERROR');
        console.error('Code:', err.code);
        console.error('Message:', err.message);
        console.error('SQL:', err.sql);
        console.error('Stack:', err.stack);
        console.error('=================================');

        return res.status(500).json({
            error: err.message || 'Failed to accept request'
        });
    }
});


// router.put('/:id/status', authenticateToken, async (req, res) => {
//     const driver_id = req.user.id;
//     const { id } = req.params;
//     const { status } = req.body; // expected: 'in_progress' or 'completed'

//     const allowed = ['in progress', 'completed'];
//     if (!allowed.includes(status)) {
//         return res.status(400).json({ error: 'Invalid status' });
//     }

//     try {
//         const [request] = await db.query(
//             'SELECT request_id, driver_id, status FROM service_requests WHERE request_id = ?',
//             [id]
//         );
//         if (!request) return res.status(404).json({ error: 'Request not found' });
//         if (request.driver_id !== driver_id) {
//             return res.status(403).json({ error: 'Not your trip' });
//         }

//         await db.query(
//             'UPDATE service_requests SET status = ?, updated_at = NOW() WHERE request_id = ?',
//             [status, id]
//         );

//         res.json({ success: true, message: `Status updated to ${status}` });
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });
// Cancel a trip (driver cancels an assigned/in-progress request)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const [request] = await db.query(
            'SELECT request_id, driver_id, user_id, status FROM service_requests WHERE request_id = ?',
            [id]
        );
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const isOwner =
            (userRole === 'driver' && request.driver_id === userId) ||
            (userRole === 'customer' && request.user_id === userId);

        if (!isOwner) {
            return res.status(403).json({ error: 'Not your trip' });
        }

        if (request.status === 'completed' || request.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot cancel completed or already cancelled trip' });
        }

        await db.query(
            `UPDATE service_requests
             SET status = 'cancelled',
                 cancelled_at = NOW(),
                 cancellation_reason = ?,
                 updated_at = NOW()
             WHERE request_id = ?`,
            [reason || `Cancelled by ${userRole}`, id]
        );

        res.json({ success: true, message: 'Trip cancelled' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === Dynamic Routes (These should come LAST to avoid conflicts) ===

// GET single request by ID
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

// DELETE request by ID
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await Request.deleteById(id);
        res.json({ success: true, message: `Request #${id} deleted` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete request: ' + err.message });
    }
});

// PUT request by ID
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


        await db.query(`
            UPDATE users u
            JOIN service_requests sr ON sr.user_id = u.user_id
            SET u.name = ?, u.phone = ?
            WHERE sr.request_id = ?
        `, [customer_name, customer_phone, id]);


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