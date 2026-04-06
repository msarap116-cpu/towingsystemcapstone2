// src/controllers/requestController.js
const Request = require('../models/requestModel');

exports.createRequest = async (req, res) => {
    try {
        // Get user_id from the authenticated token
        const user_id = req.user.id || req.user.user_id;
        
        if (!user_id) {
            console.error('No user_id in token:', req.user);
            return res.status(401).json({ error: "User not authenticated" });
        }
        
        console.log('Creating request for user:', user_id);
        console.log('Request body:', req.body);
        
        const requestId = await Request.create({
            user_id: user_id,
            service_type: req.body.service_type,
            vehicle_type: req.body.vehicle_type,
            license_plate: req.body.license_plate || null,
            location_lat: req.body.location_lat,
            location_lng: req.body.location_lng,
            address: req.body.address
        });

        if (!requestId) {
            throw new Error('Failed to create request - no ID returned');
        }

        console.log('Request created with ID:', requestId);

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