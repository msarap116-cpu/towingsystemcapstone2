// src/controllers/vehicleController.js
const Vehicle = require('../models/vehicleModel');

exports.getMyVehicles = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const vehicles = await Vehicle.getByUser(user_id);
        res.json({ vehicles });
    } catch (error) {
        console.error('getMyVehicles error:', error);
        res.status(500).json({ error: "Failed to load vehicles" });
    }
};

exports.addVehicle = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const { vehicle_type, make, model, color, year, license_plate, is_default } = req.body;

        if (!vehicle_type || !make || !model || !color || !license_plate) {
            return res.status(400).json({ error: "Missing required vehicle fields" });
        }

        const vehicle_id = await Vehicle.create({
            user_id,
            vehicle_type,
            make,
            model,
            color,
            year,
            license_plate,
            is_default
        });

        if (is_default) {
            await Vehicle.setDefault(vehicle_id, user_id);
        }

        res.status(201).json({
            message: "Vehicle added successfully",
            vehicle: { id: vehicle_id }
        });
    } catch (error) {
        console.error('addVehicle error:', error);

        // Duplicate plate for this user (unique key uq_user_plate)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "You already have a vehicle with this plate number" });
        }

        res.status(500).json({ error: "Failed to add vehicle" });
    }
};

exports.updateVehicle = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const vehicle_id = req.params.id;

        const owns = await Vehicle.belongsToUser(vehicle_id, user_id);
        if (!owns) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        await Vehicle.update(vehicle_id, user_id, req.body);
        res.json({ message: "Vehicle updated successfully" });
    } catch (error) {
        console.error('updateVehicle error:', error);
        res.status(500).json({ error: "Failed to update vehicle" });
    }
};

exports.deleteVehicle = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const vehicle_id = req.params.id;

        const owns = await Vehicle.belongsToUser(vehicle_id, user_id);
        if (!owns) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        await Vehicle.remove(vehicle_id, user_id);
        res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
        console.error('deleteVehicle error:', error);
        res.status(500).json({ error: "Failed to delete vehicle" });
    }
};

exports.setDefaultVehicle = async (req, res) => {
    try {
        const user_id = req.user.id ?? req.user.user_id;
        const vehicle_id = req.params.id;

        const owns = await Vehicle.belongsToUser(vehicle_id, user_id);
        if (!owns) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        await Vehicle.setDefault(vehicle_id, user_id);
        res.json({ message: "Default vehicle updated" });
    } catch (error) {
        console.error('setDefaultVehicle error:', error);
        res.status(500).json({ error: "Failed to set default vehicle" });
    }
};