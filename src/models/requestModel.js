// requestModel.js
const db = require('../database/database');

const Request = {
  async create({
        user_id,
        service_type_id,
        vehicle_id,
        location_lat,
        location_lng,
        address
    }) {

        if (!user_id) {
            throw new Error('user_id is required');
        }

        if (!service_type_id) {
            throw new Error('service_type_id is required');
        }


        // Get the official service price

        const serviceSql = `
            SELECT
                service_type_id,
                name,
                base_price
            FROM service_types
            WHERE service_type_id = ?
            LIMIT 1
        `;

        const serviceResult = await db.query(
            serviceSql,
            [service_type_id]
        );

        const serviceRows = Array.isArray(serviceResult[0])
            ? serviceResult[0]
            : Array.isArray(serviceResult)
                ? serviceResult
                : [];

        const service = serviceRows[0];

        if (!service) {
            throw new Error('Invalid service type');
        }

        const amount = Number(service.base_price);

        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(
                'Service price has not been configured'
            );
        }

        console.log(
            'Service:',
            service.name
        );

        console.log(
            'Service price:',
            amount
        );



        // Create request


        const sql = `
            INSERT INTO service_requests
            (
                user_id,
                service_type_id,
                vehicle_id,
                location_lat,
                location_lng,
                address,
                status,
                amount,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())
        `;

        const result = await db.query(sql, [
            user_id,
            service_type_id,
            vehicle_id || null,
            location_lat || null,
            location_lng || null,
            address || null,
            amount
        ]);

        return result?.insertId ||
               result?.[0]?.insertId ||
               null;
    },

   async getActiveByUser(user_id) {
    const sql = `
        SELECT
            request_id,
            status,
            created_at
        FROM service_requests
        WHERE user_id = ?
          AND status IN ('pending', 'assigned', 'in progress')
        ORDER BY created_at DESC
        LIMIT 1
    `;

    const result = await db.query(sql, [user_id]);

    // Your database wrapper may return either rows directly
    // or the mysql2 [rows, fields] format.
    const rows = Array.isArray(result?.[0])
        ? result[0]
        : result;

    return rows?.[0] || null;
  },

 async getLatestByUserForCooldown(user_id) {
    const sql = `
        SELECT
            request_id,
            status,
            created_at
        FROM service_requests
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    `;

    const result = await db.query(sql, [user_id]);

    const rows = Array.isArray(result?.[0])
        ? result[0]
        : result;

    return rows?.[0] || null;
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

  async updateStatus(paymentId, status) {
    const sql = `UPDATE payments SET status = ? WHERE payment_id = ?`;
    return db.query(sql, [status, paymentId]);
},

 async getLatestByUser(user_id) {

    const sql = `
        SELECT
            r.request_id,
            r.user_id,
            r.status,
            r.address,
            r.location_lat,
            r.location_lng,
            r.amount,
            r.driver_id,

            st.name AS service_type,

            v.vehicle_type,
            v.license_plate,

            dl.lat AS driver_lat,
            dl.lng AS driver_lng

        FROM service_requests r

        LEFT JOIN service_types st
            ON r.service_type_id = st.service_type_id

        LEFT JOIN vehicles v
            ON r.vehicle_id = v.vehicle_id

        LEFT JOIN driver_locations dl
            ON dl.driver_id = r.driver_id
            AND dl.recorded_at = (
                SELECT MAX(recorded_at)
                FROM driver_locations dl2
                WHERE dl2.driver_id = r.driver_id
            )

        WHERE r.user_id = ?

        ORDER BY r.created_at DESC

        LIMIT 5
    `;

    const rows = await db.query(sql, [user_id]);

    return rows;
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
    WHERE r.status IN ('pending', 'in progress')
    ORDER BY r.created_at ASC
    LIMIT 1
  `;
  const result = await db.query(sql);
  return Array.isArray(result) ? result[0] : result;
 },


  async updateDriverLocation(request_id, driver_id, lat, lng) {

    await db.query(
      `UPDATE service_requests SET driver_id = ?, updated_at = NOW() WHERE request_id = ?`,
      [driver_id, request_id]
    );

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
  },

  async updateAddress(requestId, address, lat, lng) {
    return db.query(`
        UPDATE service_requests
        SET
            address = ?,
            location_lat = ?,
            location_lng = ?,
            updated_at = NOW()
        WHERE request_id = ?
    `, [address, lat, lng, requestId]);
 }

};//const Request


module.exports = Request;