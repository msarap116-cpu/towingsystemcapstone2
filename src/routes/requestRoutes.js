// routes/requestRoutes.js
const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authenticateToken = require('../middleware/authMiddleware');
const Request = require('../models/requestModel');
const requireRole = require('../middleware/requireRole');

function shortPrivateCache(seconds = 5) {
    return (req, res, next) => {
        res.setHeader('Cache-Control', `private, max-age=${seconds}`);
        res.setHeader('Vary', 'Authorization');
        next();
    };
}

function noStore(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    next();
}

// ---- Specific routes (must come before /:id) ----

// GET /latest
router.get('/latest', authenticateToken, shortPrivateCache(5), async (req, res) => {
    const user_id = req.user.id ?? req.user.user_id;

    try {
        const result = await Request.getLatestByUser(user_id);

        if (!result || result.length === 0) {
            return res.json([]);
        }

        res.json(result);
    } catch (err) {
        console.error('Error fetching latest requests:', err);
        res.status(500).json({ error: 'Database query failed: ' + err.message });
    }
});

// GET /pending — drivers only
router.get(
    '/pending',
    authenticateToken,
    requireRole('driver'),
    shortPrivateCache(10),
    requestController.getPendingRequests
);

// GET /my-trips — drivers only
router.get(
    '/my-trips',
    authenticateToken,
    requireRole('driver'),
    shortPrivateCache(10),
    requestController.getMyTrips
);

// GET /can-create
router.get('/can-create', authenticateToken, requestController.checkCanRequest);

// POST /driver-location
router.post('/driver-location', authenticateToken, async (req, res) => {
    const { lat, lng, request_id } = req.body;
    const driver_id = req.user.id ?? req.user.user_id;

    // Use nullish checks so 0 is a valid coordinate
    if (
        lat === undefined || lat === null ||
        lng === undefined || lng === null ||
        !request_id
    ) {
        return res.status(400).json({ error: 'lat, lng, and request_id are required' });
    }

    try {
        await Request.updateDriverLocation(request_id, driver_id, lat, lng);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save location: ' + err.message });
    }
});

// POST / — create request
router.post(
    '/',
    authenticateToken,
    noStore,
    requestController.createRequest
);

// GET /my-requests
router.get(
    '/my-requests',
    authenticateToken,
    shortPrivateCache(10),
    requestController.getMyRequests
);

// GET / — all requests (admin/driver view)
router.get('/', authenticateToken, requestController.getAllRequests);

// ---- Mutations on a specific request ----

// PUT /:id/status
router.put(
    '/:id/status',
    authenticateToken,
    noStore,
    requestController.updateStatus
);

// PUT /:id/address
router.put(
    '/:id/address',
    authenticateToken,
    noStore,
    requestController.updateAddress
);

// PUT /:id/accept — drivers only
router.put(
    '/:id/accept',
    authenticateToken,
    requireRole('driver'),
    noStore,
    requestController.acceptRequest
);

// PUT /:id/cancel
router.put(
    '/:id/cancel',
    authenticateToken,
    noStore,
    requestController.cancelRequest
);

// PUT /:id — generic update
router.put(
    '/:id',
    authenticateToken,
    noStore,
    requestController.updateRequest
);

// ---- Single request by ID (must come after specific paths) ----

// GET /:id
router.get('/:id', authenticateToken, requestController.getRequestById);

// DELETE /:id — ownership checked
router.delete('/:id', authenticateToken, noStore, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id ?? req.user.user_id;
        const userRole = req.user.role;

        const rows = await Request.findForCancel(id);
        const request = Array.isArray(rows) ? rows[0] : rows;

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const isOwner =
            (userRole === 'customer' && Number(request.user_id) === Number(userId)) ||
            (userRole === 'driver' && Number(request.driver_id) === Number(userId));

        if (userRole !== 'admin' && !isOwner) {
            return res.status(403).json({ error: 'Not your request' });
        }

        if (request.status !== 'cancelled') {
            return res.status(400).json({
                error: 'Only cancelled requests can be deleted'
            });
        }

        await Request.deleteById(id);
        res.json({ success: true, message: `Request #${id} deleted` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete request: ' + err.message });
    }
});

// POST /:id/charges — driver or admin
router.post(
    '/:id/charges',
    authenticateToken,
    requireRole('driver', 'admin'),
    requestController.addAdditionalCharge
);

// GET /:id/receipt — commented out until Request.getReceiptData exists
// router.get('/:id/receipt', authenticateToken, requestController.getReceipt);

module.exports = router;