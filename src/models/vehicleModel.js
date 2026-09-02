// src/models/vehicleModel.js
//
// Matches the db.query() convention used elsewhere in this codebase:
// db.query() returns rows directly for SELECTs (not a [rows, fields] tuple),
// and returns the raw result object (with .insertId / .affectedRows) for
// INSERT/UPDATE/DELETE — see requestRoutes.js for the same pattern.
const db = require('../database/database');

exports.getByUser = async (user_id) => {
    const rows = await db.query(
        `SELECT * FROM vehicles WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
        [user_id]
    );
    return rows;
};

exports.getById = async (vehicle_id) => {
    const rows = await db.query(
        `SELECT * FROM vehicles WHERE vehicle_id = ?`,
        [vehicle_id]
    );
    return rows[0] || null;
};

// Confirms a vehicle belongs to the given user — used by requestController
// to stop a customer from submitting a request with someone else's vehicle_id.
exports.belongsToUser = async (vehicle_id, user_id) => {
    const rows = await db.query(
        `SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND user_id = ?`,
        [vehicle_id, user_id]
    );
    return rows.length > 0;
};

exports.create = async (data) => {
    const {
        user_id,
        vehicle_type,
        make,
        model,
        color,
        year,
        license_plate,
        is_default
    } = data;

    const result = await db.query(
        `INSERT INTO vehicles
            (user_id, vehicle_type, make, model, color, year, license_plate, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, vehicle_type, make, model, color, year || null, license_plate, is_default ? 1 : 0]
    );

    return result.insertId;
};

exports.update = async (vehicle_id, user_id, data) => {
    const { vehicle_type, make, model, color, year, license_plate } = data;

    await db.query(
        `UPDATE vehicles
         SET vehicle_type = ?, make = ?, model = ?, color = ?, year = ?, license_plate = ?
         WHERE vehicle_id = ? AND user_id = ?`,
        [vehicle_type, make, model, color, year || null, license_plate, vehicle_id, user_id]
    );
};

exports.remove = async (vehicle_id, user_id) => {
    await db.query(
        `DELETE FROM vehicles WHERE vehicle_id = ? AND user_id = ?`,
        [vehicle_id, user_id]
    );
};

// Only one default vehicle per user — clear existing defaults before setting a new one.
exports.clearDefault = async (user_id) => {
    await db.query(
        `UPDATE vehicles SET is_default = 0 WHERE user_id = ?`,
        [user_id]
    );
};

exports.setDefault = async (vehicle_id, user_id) => {
    await exports.clearDefault(user_id);
    await db.query(
        `UPDATE vehicles SET is_default = 1 WHERE vehicle_id = ? AND user_id = ?`,
        [vehicle_id, user_id]
    );
};