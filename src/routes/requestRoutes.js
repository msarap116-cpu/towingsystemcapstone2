// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticateToken = require('../middleware/authMiddleware');
const Request = require('../models/requestModel');
const requireRole = require('../middleware/requireRole');

router.use((req, res, next) => {
    // console.log('requestRoutes hit:', req.method, req.path);
    next();
});

// === Specific Routes (Order matters!) === why?

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

// GET /pending all unassigned pending requests for drivers This MUST come before GET /:id
router.get(
    "/pending",
    authenticateToken,
    requireRole("driver"),
    requestController.getPendingRequests
);

// GET /my-trips – all requests assigned to this driver - This MUST come before GET /:id
router.get(
    "/my-trips",
    authenticateToken,
    requireRole("driver"),
    requestController.getMyTrips
);

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

router.put('/:id/status', authenticateToken, requestController.updateStatus);

router.put('/:id/address', authenticateToken, requestController.updateAddress);

// Accept a request (assign driver, set status = 'assigned')

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
router.put(
    "/:id/accept",
    authenticateToken,
    requireRole("driver"),
    requestController.acceptRequest
);

router.put(
    "/:id/cancel",
    authenticateToken,
    requestController.cancelRequest
);

router.put(
    "/:id",
    authenticateToken,
    requestController.updateRequest
);
// GET single request by ID
router.get(
    "/:id",
    authenticateToken,
    requestController.getRequestById
);

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
router.post(
    '/:id/charges',
    authenticateToken,
    requireRole('driver', 'admin'),
    requestController.addAdditionalCharge
);

router.get(
    '/:id/receipt',
    authenticateToken,
    requestController.getReceipt
);




module.exports = router;