// src/controllers/requestController.js
const Request = require('../models/requestModel');

exports.createRequest = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id;
        
        if (!user_id) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        const requestId = await Request.create({
            user_id,
            service_type_id: req.body.service_type_id || null,
            vehicle_id:      req.body.vehicle_id      || null,
            location_lat:    req.body.location_lat    || null,
            location_lng:    req.body.location_lng    || null,
            address:         req.body.address         || null
        });

        if (!requestId) throw new Error('Failed to create request - no ID returned');

        res.json({
            message: "Request created successfully",
            request: { id: requestId }
        });

    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: "Failed to create request: " + error.message });
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

        // ✅ FIX: wrap in object
        res.json({ requests });

    } catch (error) {
        console.error('getAllRequests error:', error);
        res.status(500).json({ error: "Failed to load requests" });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        await Request.updateStatus(req.params.id, status);
        res.json({ message: "Status updated" });
    } catch (error) {
        console.error('updateStatus error:', error);
        res.status(500).json({ error: "Failed to update status" });
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