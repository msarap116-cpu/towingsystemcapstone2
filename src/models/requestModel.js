// src/models/requestModel.js
const db = require('../database/database');

const Request = {

    async create({ user_id, service_type, vehicle_type, license_plate, location_lat, location_lng, address }) {
        // Validate user_id
        if (!user_id) {
            throw new Error('user_id is required in requestModel');
        }
        
        const sql = `
            INSERT INTO service_requests 
            (user_id, service_type, vehicle_type, license_plate, location_lat, location_lng, address, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `;

        console.log('Creating request with user_id:', user_id);
        console.log('SQL:', sql);
        
        const result = await db.query(sql, [
            user_id,
            service_type || null,
            vehicle_type || null,
            license_plate || null,
            location_lat || null,
            location_lng || null,
            address || null
        ]);

        // For MySQL2, result might be an object with insertId
        if (result && result.insertId) {
            return result.insertId;
        }
        
        // If result is an array (some configurations)
        if (Array.isArray(result) && result[0] && result[0].insertId) {
            return result[0].insertId;
        }
        
        // If result is the first element of the result array
        if (Array.isArray(result) && result.insertId) {
            return result.insertId;
        }
        
        console.log('Query result:', result);
        return null;
    },

    async getByUser(user_id) {
        const sql = `
            SELECT * FROM service_requests
            WHERE user_id = ?
            ORDER BY created_at DESC
        `;
        return await db.query(sql, [user_id]);
    },

    async getAll() {
    const sql = `
        SELECT 
            r.request_id,
            u.name AS customer_name,
            u.phone AS customer_phone,
            r.service_type,
            r.vehicle_type,
            r.address AS location,
            r.status,
            r.created_at,
            r.license_plate
        FROM service_requests r
        JOIN users u ON r.user_id = u.user_id
        ORDER BY r.created_at DESC
    `;
    return await db.query(sql);
},

    async updateStatus(request_id, status) {
        const sql = `
            UPDATE service_requests
            SET status = ?
            WHERE request_id = ?
        `;
        await db.query(sql, [status, request_id]);
    },

    async getLatestByUser(user_id) {
        const sql = `
            SELECT request_id, user_id, service_type, vehicle_type,
                    license_plate, location_lat, location_lng, address, status,
                    driver_lat, driver_lng, driver_id
            FROM service_requests
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        `;
        const result = await db.query(sql, [user_id]);
        return Array.isArray(result) ? result[0] : result;
    },

    async getLatestPendingForDriver() {
        const sql = `
            SELECT request_id, user_id, service_type, vehicle_type,
                    license_plate, location_lat, location_lng, address, status,
                    driver_lat, driver_lng, driver_id
            FROM service_requests
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
        `;
        const result = await db.query(sql);
        return Array.isArray(result) ? result[0] : result;
    },

    async updateDriverLocation(request_id, driver_id, lat, lng) {
        const sql = `
            UPDATE service_requests
            SET driver_lat = ?, driver_lng = ?, driver_id = ?
            WHERE request_id = ?
        `;
        await db.query(sql, [lat, lng, driver_id, request_id]);
    },
    async findById(id) {
    const [rows] = await db.query('SELECT * FROM service_requests WHERE request_id = ?', [id]);
    return rows[0] || null;
},
 async deleteById(id) {
    await db.query('DELETE FROM service_requests WHERE request_id = ?', [id]);
}
};

module.exports = Request;