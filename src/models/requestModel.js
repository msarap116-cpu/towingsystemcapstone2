const db = require('../database/database');

const Request = {

  // vehicle_id is now required (pre-registered vehicle)
  // service_type_id replaces the raw string
  async create({ user_id, service_type_id, vehicle_id, location_lat, location_lng, address }) {
    if (!user_id) throw new Error('user_id is required');

    const sql = `
      INSERT INTO service_requests 
        (user_id, service_type_id, vehicle_id, location_lat, location_lng, address, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
    `;
    const result = await db.query(sql, [
      user_id,
      service_type_id || null,
      vehicle_id || null,
      location_lat || null,
      location_lng || null,
      address || null
    ]);

    return result?.insertId || result?.[0]?.insertId || null;
  },

  async getByUser(user_id) {
    const sql = `
      SELECT 
        r.request_id, r.status, r.address, r.created_at,
        st.name AS service_type,
        v.vehicle_type, v.license_plate
      FROM service_requests r
      LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
    `;
    return await db.query(sql, [user_id]);
  },

  async getAll() {
    const sql = `
      SELECT 
        r.request_id,
        u.name AS customer_name,
        u.phone AS customer_phone,
        st.name AS service_type,
        v.vehicle_type,
        v.license_plate,
        r.address AS location,
        r.status,
        r.created_at
      FROM service_requests r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      ORDER BY r.created_at DESC
    `;
    return await db.query(sql);
  },

  async updateStatus(request_id, status) {
    const sql = `UPDATE service_requests SET status = ?, updated_at = NOW() WHERE request_id = ?`;
    await db.query(sql, [status, request_id]);
  },

  async getLatestByUser(user_id) {
    const sql = `
      SELECT 
        r.request_id, r.user_id, r.status, r.address,
        r.location_lat, r.location_lng, r.driver_id,
        st.name AS service_type,
        v.vehicle_type, v.license_plate,
        dl.lat AS driver_lat, dl.lng AS driver_lng
      FROM service_requests r
      LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      LEFT JOIN (
        SELECT driver_id, lat, lng
        FROM driver_locations
        WHERE (driver_id, recorded_at) IN (
          SELECT driver_id, MAX(recorded_at) FROM driver_locations GROUP BY driver_id
        )
      ) dl ON r.driver_id = dl.driver_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    const result = await db.query(sql, [user_id]);
    return Array.isArray(result) ? result[0] : result;
  },

  async getLatestPendingForDriver() {
    const sql = `
      SELECT 
        r.request_id, r.user_id, r.status, r.address,
        r.location_lat, r.location_lng, r.driver_id,
        st.name AS service_type,
        v.vehicle_type, v.license_plate
      FROM service_requests r
      LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.status = 'pending'
      ORDER BY r.created_at ASC
      LIMIT 1
    `;
    const result = await db.query(sql);
    return Array.isArray(result) ? result[0] : result;
  },

  // Now INSERTs into driver_locations instead of updating the request row
  async updateDriverLocation(request_id, driver_id, lat, lng) {
    // Update which driver is assigned to the request
    await db.query(
      `UPDATE service_requests SET driver_id = ?, updated_at = NOW() WHERE request_id = ?`,
      [driver_id, request_id]
    );
    // Log the location separately
    await db.query(
      `INSERT INTO driver_locations (driver_id, lat, lng, recorded_at) VALUES (?, ?, ?, NOW())`,
      [driver_id, lat, lng]
    );
  },

  async findById(id) {
    const sql = `
      SELECT 
        r.*,
        st.name AS service_type,
        v.vehicle_type, v.license_plate
      FROM service_requests r
      LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
      LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
      WHERE r.request_id = ?
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async deleteById(id) {
    await db.query('DELETE FROM service_requests WHERE request_id = ?', [id]);
  }
};

module.exports = Request;