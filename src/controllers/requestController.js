// src/controllers/requestController.js
const Request = require('../models/requestModel');
const Vehicle = require('../models/vehicleModel');
const db = require('../database/database');
const Notification = require('../models/notificationModel');

exports.createRequest = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User not authenticated"
            });
        }



        const activeRequest = await Request.getActiveByUser(user_id);

        if (activeRequest) {
            return res.status(409).json({
                error: "You already have an active request.",
                request: {
                    id: activeRequest.request_id,
                    status: activeRequest.status
                }
            });
        }


        const latestRequest =
            await Request.getLatestByUserForCooldown(user_id);

        if (latestRequest) {
            const createdAt = new Date(latestRequest.created_at);
            const now = new Date();

            const elapsedSeconds =
                (now - createdAt) / 1000;

            const cooldownSeconds = 30;

            if (elapsedSeconds < cooldownSeconds) {
                const remainingSeconds = Math.ceil(
                    cooldownSeconds - elapsedSeconds
                );

                return res.status(429).json({
                    error: "Please wait before submitting another request.",
                    remaining_seconds: remainingSeconds
                });
            }
        }


        // vehicle_id must reference a vehicle owned by the requesting
        // customer — never trust it blindly, or a user could submit a
        // request pointing at someone else's vehicle_id.
        const vehicle_id = req.body.vehicle_id || null;

        if (!vehicle_id) {
            return res.status(400).json({
                error: "Please select a vehicle for this request."
            });
        }

        const ownsVehicle = await Vehicle.belongsToUser(vehicle_id, user_id);

        if (!ownsVehicle) {
            return res.status(403).json({
                error: "Invalid vehicle selection."
            });
        }


        // 4. CREATE REQUEST

        const requestId = await Request.create({
            user_id,
            service_type_id: req.body.service_type_id || null,
            vehicle_id,
            location_lat: req.body.location_lat || null,
            location_lng: req.body.location_lng || null,
            address: req.body.address || null
        });

        if (!requestId) {
            throw new Error(
                'Failed to create request - no ID returned'
            );
        }

        // 4.5 NOTIFY — new request is waiting, let drivers (and admins) know
        try {
            await Notification.createForRole('driver', {
                requestId: requestId,
                type: 'order',
                message: `New service request #${requestId} is available.`
            });

            await Notification.createForRole('admin', {
                requestId: requestId,
                type: 'order',
                message: `New service request #${requestId} was submitted.`
            });
        } catch (notifErr) {
            console.error('Notification failed (non-fatal):', notifErr);
        }

        // 5. SUCCESS

        res.status(201).json({
            message: "Request created successfully",
            request: {
                id: requestId
            }
        });

    } catch (error) {
        console.error('Create request error:', error);

        res.status(500).json({
            error: "Failed to create request: " + error.message
        });
    }
};

exports.getMyRequests = async (req, res) => {
    try {
        const userId = req.user.id || req.user.user_id;
        const requests = await Request.getByUser(userId);
        res.json(requests);
    } catch (error) {
        console.error('getMyRequests error:', error);
        res.status(500).json({ error: "Failed to load requests" });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const requests = await Request.getAll();


        res.json({ requests });

    } catch (error) {
        console.error('getAllRequests error:', error);
        res.status(500).json({ error: "Failed to load requests" });
    }
};
exports.getPendingRequests = async (req, res) => {
    // Role check (authorization). If you want, move this to a middleware.
    if (req.user.role !== "driver") {
        return res.status(403).json({ error: "Only drivers can access this endpoint" });
    }

    try {
        const requests = await Request.findPendingUnassigned();
        return res.json(requests);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

exports.getMyTrips = async (req, res) => {
    const driverId = req.user.id;

    try {
        const trips = await Request.findByDriverId(driverId);
        return res.json(trips);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

exports.acceptRequest = async (req, res) => {
    const driverId = req.user.id;
    const { id } = req.params;

    console.log('=================================');
    console.log('DRIVER ACCEPT JOB');
    console.log('Request ID:', id);
    console.log('Driver ID:', driverId);
    console.log('=================================');

    try {
        // ---- 1. Look up the request ----
        const result = await Request.findSerVice(id);

        console.log('Accept request query result:', result);

        // Your db.query() returns rows directly,
        // but this also safely handles [rows, fields].
        const rows = Array.isArray(result[0]) ? result[0] : result;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = rows[0];
        console.log('Request found:', request);

        // ---- 2. Business rules ----
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Request is not pending. Current status: ${request.status}`,
            });
        }

        if (request.driver_id !== null) {
            return res.status(400).json({
                error: 'Already assigned to a driver',
            });
        }

        // ---- 3. Atomic claim ----
        const updateResult = await Request.assignDriver(id, driverId);

        console.log('Accept update result:', updateResult);

        const affectedRows = updateResult.affectedRows;

        if (affectedRows === 0) {
            return res.status(409).json({
                error: 'Request was already accepted or assigned by another user.',
            });
        }

        // ---- 4. Notify (non-fatal) ----
        try {
            await Notification.create({
                userId: request.user_id,
                requestId: id,
                type: 'order',
                message: `A driver has accepted your service request #${id}.`,
            });
        } catch (notifErr) {
            console.error('Notification failed (non-fatal):', notifErr);
        }

        console.log(`Driver ${driverId} successfully accepted request ${id}`);

        return res.json({
            success: true,
            message: 'Request accepted',
            request_id: Number(id),
            driver_id: Number(driverId),
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
            error: err.message || 'Failed to accept request',
        });
    }
};


exports.updateStatus = async (req, res) => {
    const driver_id = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowed = [
        'assigned',
        'in progress',
        'completed'
    ];

    if (!allowed.includes(status)) {
        return res.status(400).json({
            error: 'Invalid status'
        });
    }

    try {

        // db.query() ALREADY returns the rows
        const rows = await db.query(
            `
            SELECT
                request_id,
                driver_id,
                status,
                amount
            FROM service_requests
            WHERE request_id = ?
            `,
            [id]
        );

        console.log('Request lookup result:', rows);

        if (!rows || rows.length === 0) {
            return res.status(404).json({
                error: 'Request not found'
            });
        }

        const request = rows[0];

        console.log('Status update request:', {
            request_id: request.request_id,
            driver_id: request.driver_id,
            current_status: request.status,
            new_status: status
        });

        // Make sure this request belongs to this driver
        if (Number(request.driver_id) !== Number(driver_id)) {
            return res.status(403).json({
                error: 'Not your trip'
            });
        }

        // Guard against double-completion (avoid duplicate earnings rows)
        if (status === 'completed' && request.status === 'completed') {
            return res.status(400).json({
                error: 'Request is already completed'
            });
        }

        // If completing, set completed_at too; otherwise just status/updated_at
        const updateSql = status === 'completed'
            ? `UPDATE service_requests
               SET status = ?, completed_at = NOW(), updated_at = NOW()
               WHERE request_id = ? AND driver_id = ?`
            : `UPDATE service_requests
               SET status = ?, updated_at = NOW()
               WHERE request_id = ? AND driver_id = ?`;

        // db.query() ALREADY returns the UPDATE result
        const result = await db.query(updateSql, [status, id, driver_id]);

        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            return res.status(400).json({
                error: 'Status was not updated'
            });
        }

        // Record driver earnings on completion
        if (status === 'completed') {
            try {
                await db.query(
                    `INSERT INTO driver_earnings (driver_id, request_id, amount, type, description)
                     VALUES (?, ?, ?, 'job_completion', ?)`,
                    [driver_id, request.request_id, request.amount, `Job #${request.request_id} completed`]
                );
                console.log(`Earnings recorded for driver ${driver_id}, request ${request.request_id}, amount ${request.amount}`);
            } catch (earningsErr) {
                // Don't fail the whole request just because the earnings insert failed —
                // log it so it can be reconciled, but the trip status change already succeeded.
                console.error('Failed to record driver earnings (non-fatal):', earningsErr);
            }
        }

        console.log(
            `GoodWrenchRequest #${id} status changed: ${request.status} → ${status}`
        );

        res.json({
            success: true,
            request_id: Number(id),
            previous_status: request.status,
            status: status,
            message: `Status updated to ${status}`
        });

    } catch (err) {

        console.error('updateStatus error:', err);

        res.status(500).json({
            error: err.message
        });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const requestId = req.params.id;
        const { address, location_lat, location_lng } = req.body;

        await Request.updateAddress(
            requestId,
            address,
            location_lat,
            location_lng
        );

        res.json({
            message: "Address updated successfully"
        });

    } catch (error) {
        console.error('updateAddress error:', error);
        res.status(500).json({ error: "Failed to update address" });
    }
};


/**
 * GET /api/service-requests/:id
 * Fetch full details for a single service request.
 */
exports.getRequestById = async (req, res) => {
    const { id } = req.params;

    try {
        const rows = await Request.findDetailsById(id);

        console.log('GET /:id rows:', rows); // debug

        if (!rows || !rows[0]) {
            return res.status(404).json({ message: 'Request not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('GET /:id error:', err.message); // this shows in Render logs
        res.status(500).json({ error: 'Failed to fetch request: ' + err.message });
    }
};
/**
 * PUT /api/service-requests/:id
 * Update customer info + request details for a given request.
 */
exports.updateRequest = async (req, res) => {
    const { id } = req.params;
    const { customer_name, customer_phone, service_type, location, status } = req.body;

    try {
        // ---- 1. Verify the request exists ----
        const rows = await Request.findRequestAndUser(id);

        if (!rows || !rows[0]) {
            return res.status(404).json({ message: 'Request not found' });
        }

        // ---- 2. Update customer info ----
        await Request.updateCustomerInfo(id, customer_name, customer_phone);

        // ---- 3. Update request details ----
        await Request.updateRequestDetails(id, service_type, location, status);

        // ---- 4. Respond ----
        res.json({ success: true, message: `Request #${id} updated` });

    } catch (err) {
        console.error('PUT /:id error:', err.message);
        res.status(500).json({
            error: 'Failed to update request: ' + err.message,
        });
    }
};
exports.cancelRequest = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;
    const { reason } = req.body;

    try {
        const rows = await Request.findForCancel(id);
        const request = Array.isArray(rows) ? rows[0] : rows;
        if (!request) return res.status(404).json({ error: 'Request not found' });

        const isOwner =
            (userRole === 'driver' && request.driver_id === userId) ||
            (userRole === 'customer' && request.user_id === userId);
        if (!isOwner) return res.status(403).json({ error: 'Not your trip' });

        if (request.status === 'completed' || request.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot cancel completed or already cancelled trip' });
        }

        if (userRole === 'customer') {
            await Request.customerCancel(id, reason);
            res.json({ success: true, message: 'Trip cancelled' });

            if (request.driver_id) {
                await Notification.create({
                    userId: request.driver_id,
                    requestId: id,
                    type: 'order',
                    message: `Request #${id} was cancelled by the customer.${reason ? ' Reason: ' + reason : ''}`
                });
            }
        } else {
            await Request.driverReleaseAssignment(id, userId, reason);
            res.json({ success: true, message: 'Trip released back to the pending pool' });

            await Notification.create({
                userId: request.user_id,
                requestId: id,
                type: 'order',
                message: `Your driver had to cancel. We're finding you a new driver.${reason ? ' Reason: ' + reason : ''}`
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const requestModel = require('../models/requestModel');

exports.addAdditionalCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount } = req.body;
        const added_by = req.user?.user_id || null; // from authMiddleware

        await requestModel.addAdditionalCharge({
            request_id: id,
            description,
            amount,
            added_by
        });

        res.json({ success: true, message: 'Additional charge added' });

    } catch (error) {
        console.error('Add additional charge error:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.getReceipt = async (req, res) => {
    try {
        const { id } = req.params;

        const receipt = await requestModel.getReceiptData(id);

        res.json({ success: true, receipt });

    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(400).json({ error: error.message });
    }
};