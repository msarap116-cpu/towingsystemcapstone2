// src/controllers/requestController.js
const Request = require('../models/requestModel');
const Vehicle = require('../models/vehicleModel');
const db = require('../database/database');
const { notifyUser, notifyRole } = require('../../utils/notify');


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
        // NEW: block if a finished request is still unpaid
        const unpaid = await Request.getUnpaidByUser(user_id);

        if (unpaid) {
            return res.status(402).json({
                error: "Please settle your previous payment before making a new request.",
                code: "UNPAID_REQUEST",
                request: {
                    id: unpaid.request_id,
                    amount: unpaid.total_amount,
                    payment_status: unpaid.payment_status || 'none'
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

        //NOTIFY — new request is waiting, let drivers (and admins) know
        await notifyRole('driver', {
            requestId,
            type: 'order',
            message: `New service request #${requestId} is available.`,
        });

        await notifyRole('admin', {
            requestId,
            type: 'order',
            message: `New service request #${requestId} was submitted.`,
        });

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
        await notifyUser(request.user_id, {
            requestId: id,
            type: 'order',
            message: `A driver has accepted your service request #${id}.`,
        });

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

    const allowed = ['assigned', 'in progress', 'completed'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    const assignmentStatusMap = {
        'assigned': 'accepted',
        'in progress': 'in_progress',
        'completed': 'completed',
    };

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // --- 1. Lock + fetch the request row ---
        const raw = await conn.query(
            `SELECT request_id, driver_id, status, amount, base_amount, total_amount
             FROM service_requests
             WHERE request_id = ?
             FOR UPDATE`,
            [id]
        );
        const rows = Array.isArray(raw[0]) ? raw[0] : raw;

        if (!rows || rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = rows[0];

        // debug — remove after verified
        console.log('[updateStatus]', JSON.stringify({
            tokenId: driver_id,
            tokenIdType: typeof driver_id,
            dbDriverId: request.driver_id,
            dbDriverIdType: typeof request.driver_id,
            dbStatus: request.status,
            equal: Number(request.driver_id) === Number(driver_id),
        }));

        if (Number(request.driver_id) !== Number(driver_id)) {
            await conn.rollback();
            return res.status(403).json({ error: 'Not your trip' });
        }

        if (status === 'completed' && request.status === 'completed') {
            await conn.rollback();
            return res.status(400).json({ error: 'Request is already completed' });
        }

        // --- 2. Update service_requests ---
        const updateSql = status === 'completed'
            ? `UPDATE service_requests
               SET status = ?, completed_at = NOW(), updated_at = NOW()
               WHERE request_id = ? AND driver_id = ?`
            : `UPDATE service_requests
               SET status = ?, updated_at = NOW()
               WHERE request_id = ? AND driver_id = ?`;

        const result = await conn.query(updateSql, [status, id, driver_id]);

        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'Status was not updated' });
        }

        // --- 3. Mirror into driver_assignments ---
        const assignmentStatus = assignmentStatusMap[status];
        const timestampCol =
            status === 'in progress' ? 'started_at' :
            status === 'completed'   ? 'completed_at' :
            null;

        let actualDistanceKm = null;
        let actualTimeMinutes = null;

        if (status === 'completed') {
            const rawAssignment = await conn.query(
                `SELECT started_at, estimated_distance_km
                 FROM driver_assignments
                 WHERE request_id = ? AND driver_id = ?
                   AND status NOT IN ('completed','cancelled')
                 LIMIT 1`,
                [id, driver_id]
            );
            const assignmentRows = Array.isArray(rawAssignment[0]) ? rawAssignment[0] : rawAssignment;
            const assignment = assignmentRows?.[0];

            if (assignment?.started_at) {
                const startedMs = new Date(assignment.started_at).getTime();
                actualTimeMinutes = Math.max(0, Math.round((Date.now() - startedMs) / 60000));
            }

            const clientDistance = Number(req.body.actualDistanceKm);
            actualDistanceKm = Number.isFinite(clientDistance)
                ? clientDistance
                : assignment?.estimated_distance_km ?? null;
        }

        const assignmentSql = status === 'completed'
            ? `UPDATE driver_assignments
               SET status = ?, completed_at = NOW(), actual_distance_km = ?, actual_time_minutes = ?, updated_at = NOW()
               WHERE request_id = ? AND driver_id = ? AND status NOT IN ('completed','cancelled')`
            : timestampCol
                ? `UPDATE driver_assignments
                   SET status = ?, ${timestampCol} = NOW(), updated_at = NOW()
                   WHERE request_id = ? AND driver_id = ? AND status NOT IN ('completed','cancelled')`
                : `UPDATE driver_assignments
                   SET status = ?, updated_at = NOW()
                   WHERE request_id = ? AND driver_id = ? AND status NOT IN ('completed','cancelled')`;

        const assignmentParams = status === 'completed'
            ? [assignmentStatus, actualDistanceKm, actualTimeMinutes, id, driver_id]
            : [assignmentStatus, id, driver_id];

        const assignmentResult = await conn.query(assignmentSql, assignmentParams);

        if (assignmentResult.affectedRows === 0) {
            console.warn(
                `No matching driver_assignments row updated for request ${id}, driver ${driver_id}, status ${assignmentStatus}`
            );
        }

        // --- 4. Earnings on completion ---
        if (status === 'completed') {
            try {
                const earningAmount = Number(request.total_amount ?? request.amount);
                await conn.query(
                    `INSERT INTO driver_earnings (driver_id, request_id, amount, type, description)
                     VALUES (?, ?, ?, 'job_completion', ?)`,
                    [driver_id, request.request_id, earningAmount, `Job #${request.request_id} completed`]
                );
            } catch (earningsErr) {
                console.error('Failed to record driver earnings (non-fatal):', earningsErr);
            }
        }

        await conn.commit();

        res.json({
            success: true,
            request_id: Number(id),
            previous_status: request.status,
            status: status,
            message: `Status updated to ${status}`,
        });
    } catch (err) {
        await conn.rollback();
        console.error('updateStatus error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
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

            // notify BEFORE responding
            if (request.driver_id) {
                const cancelMsg =
                    `Request #${id} was cancelled by the customer.` +
                    (reason ? ` Reason: ${reason}` : '');

                await notifyUser(request.driver_id, {
                    requestId: id,
                    type: 'order',
                    message: cancelMsg,
                });

                await notifyRole('admin', {
                    requestId: id,
                    type: 'order',
                    message: cancelMsg,
                });
            }

            return res.json({ success: true, message: 'Trip cancelled' });
        }

        // driver branch
        await Request.driverReleaseAssignment(id, userId, reason);

        await notifyUser(request.user_id, {
            requestId: id,
            type: 'order',
            message:
                `Your driver had to cancel. We're finding you a new driver.` +
                (reason ? ` Reason: ${reason}` : ''),
        });

        await notifyRole('driver', {
            requestId: id,
            type: 'order',
            message: `Request #${id} is back in the pending pool.`,
        });

        return res.json({ success: true, message: 'Trip released back to the pending pool' });
    } catch (err) {
        console.error('cancelRequest error:', err);
        return res.status(500).json({ error: err.message });
    }
};

exports.addAdditionalCharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { description, amount } = req.body;
        const added_by = req.user?.id || null; // from authMiddleware

        await Request.addAdditionalCharge({
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

        const receipt = await Request.getReceiptData(id);

        res.json({ success: true, receipt });

    } catch (error) {
        console.error('Get receipt error:', error);
        res.status(400).json({ error: error.message });
    }
};
exports.checkCanRequest = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const unpaid = await Request.getUnpaidByUser(user_id);

        if (unpaid) {
            return res.json({
                canRequest: false,
                code: 'UNPAID_REQUEST',
                request: {
                    id: unpaid.request_id,
                    amount: unpaid.total_amount,
                    payment_status: unpaid.payment_status || 'none'
                }
            });
        }

        res.json({ canRequest: true });
    } catch (error) {
        console.error('Check can request error:', error);
        res.status(500).json({ error: 'Failed to check payment status.' });
    }
};