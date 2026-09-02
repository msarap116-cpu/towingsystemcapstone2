// src/controllers/requestController.js
const Request = require('../models/requestModel');
const Vehicle = require('../models/vehicleModel');
const db = require('../database/database');

exports.createRequest = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;

        if (!user_id) {
            return res.status(401).json({
                error: "User not authenticated"
            });
        }


        // 1. CHECK FOR EXISTING ACTIVE REQUEST

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


        // 2. CHECK REQUEST COOLDOWN

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


        // 3. VALIDATE THE VEHICLE BELONGS TO THIS USER

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
                status
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

        // db.query() ALREADY returns the UPDATE result
        const result = await db.query(
            `
            UPDATE service_requests
            SET
                status = ?,
                updated_at = NOW()
            WHERE request_id = ?
            AND driver_id = ?
            `,
            [status, id, driver_id]
        );

        console.log('Update result:', result);

        if (result.affectedRows === 0) {
            return res.status(400).json({
                error: 'Status was not updated'
            });
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