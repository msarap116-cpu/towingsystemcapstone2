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

    const serviceResult = await db.query(serviceSql, [service_type_id]);

    const serviceRows = Array.isArray(serviceResult[0])
        ? serviceResult[0]
        : Array.isArray(serviceResult)
            ? serviceResult
            : [];

    const service = serviceRows[0];

    if (!service) {
        throw new Error('Invalid service type');
    }

    const basePrice = Number(service.base_price);

    if (!Number.isFinite(basePrice) || basePrice <= 0) {
        throw new Error('Service price has not been configured');
    }

    console.log('Service:', service.name);
    console.log('Service price:', basePrice);

    // Create request — base_amount and total_amount start equal
    // (total_amount grows later via addAdditionalCharge)
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
            base_amount,
            total_amount,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())
    `;

    const result = await db.query(sql, [
        user_id,
        service_type_id,
        vehicle_id || null,
        location_lat || null,
        location_lng || null,
        address || null,
        basePrice,   // amount (kept for backward compatibility)
        basePrice,   // base_amount
        basePrice    // total_amount
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
        r.total_amount,
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
            r.base_amount,
            r.total_amount,
            r.driver_id,

            st.name AS service_type,
            v.vehicle_type,
            v.license_plate,

            dl.lat AS driver_lat,
            dl.lng AS driver_lng,

            du.name AS driver_name,
            du.phone AS driver_phone

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

        LEFT JOIN users du
            ON du.user_id = r.driver_id

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
async findPendingUnassigned() {

    const sql = `
        SELECT
            r.request_id,
            u.name AS customer_name,
            u.phone AS customer_phone,
            st.name AS service_type,
            v.vehicle_type,
            v.license_plate,
            r.address AS location,
            r.location_lat,
            r.location_lng,
            r.status,
            r.created_at,
            r.base_amount,
            r.total_amount,
            r.amount
        FROM service_requests r
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
        LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.status = 'pending' AND r.driver_id IS NULL
        ORDER BY r.created_at ASC
    `;

    return db.query(sql);
},
async findByDriverId(driverId) {
    const sql = `
        SELECT
            r.request_id,
            u.name AS customer_name,
            u.phone AS customer_phone,
            st.name AS service_type,
            v.vehicle_type,
            v.license_plate,
            r.address AS location,
            r.location_lat,
            r.location_lng,
            r.status,
            r.created_at,
            r.completed_at,
            r.amount,
            r.base_amount,
            r.total_amount
        FROM service_requests r
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
        LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.driver_id = ?
        ORDER BY r.created_at DESC
    `;

    return db.query(sql, [driverId]);
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
 },
/**
 * Find a single service request by its id.
 * Used before accepting to check status / ownership.
 *
 * @param {number|string} requestId
 */
 async findSerVice(requestId){
    const sql = `
        SELECT
            request_id,
            status,
            driver_id,
            user_id
        FROM service_requests
        WHERE request_id = ?
    `;

    return db.query(sql, [requestId]);
},

/**
 * Atomically assign a driver to a pending, unassigned request.
 * Returns the raw result object from mysql2 (contains affectedRows).
 *
 * @param {number|string} requestId
 * @param {number|string} driverId
 */
async assignDriver(requestId, driverId){
    const sql = `
        UPDATE service_requests
        SET
            driver_id = ?,
            status = 'assigned',
            updated_at = NOW()
        WHERE request_id = ?
        AND driver_id IS NULL
        AND status = 'pending'
    `;

    return db.query(sql, [driverId, requestId]);
},
/**
 * Find a request's key fields for ownership/status validation.
 * (Same columns as findById — reuse it if you prefer.)
 *
 * @param {number|string} requestId
 */
async  findForCancel(requestId) {
    const sql = `
        SELECT request_id, driver_id, user_id, status
        FROM service_requests
        WHERE request_id = ?
    `;

    return db.query(sql, [requestId]);
},

/**
 * Mark a service request as cancelled.
 *
 * @param {number|string} requestId
 * @param {string} reason - cancellation reason (already defaulted by controller)
 */
async markCancelled(requestId, reason) {
    const sql = `
        UPDATE service_requests
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = ?,
            updated_at = NOW()
        WHERE request_id = ?
    `;

    return db.query(sql, [reason, requestId]);
},
/**
 * Fetch a single service request with joined customer / service / vehicle info.
 * Used for the request details endpoint.
 *
 * @param {number|string} requestId
 */
async findDetailsById(requestId) {
    const sql = `
        SELECT
            sr.request_id,
            u.name        AS customer_name,
            u.phone       AS customer_phone,
            st.name       AS service_type,
            v.vehicle_type,
            v.license_plate,
            sr.address    AS location,
            sr.status,
            sr.created_at
        FROM service_requests sr
        LEFT JOIN users u          ON sr.user_id         = u.user_id
        LEFT JOIN service_types st ON sr.service_type_id = st.service_type_id
        LEFT JOIN vehicles v       ON sr.vehicle_id      = v.vehicle_id
        WHERE sr.request_id = ?
    `;

    return db.query(sql, [requestId]);
},

/**
 * Minimal lookup used by PUT /:id to verify the request exists
 * and to know which user it belongs to.
 *
 * @param {number|string} requestId
 */
async findRequestAndUser(requestId) {
    const sql = `
        SELECT sr.request_id, sr.user_id
        FROM service_requests sr
        WHERE sr.request_id = ?
    `;

    return db.query(sql, [requestId]);
},

/**
 * Update the customer's name and phone via the request's user_id.
 *
 * @param {number|string} requestId
 * @param {string} customerName
 * @param {string} customerPhone
 */
async updateCustomerInfo(requestId, customerName, customerPhone) {
    const sql = `
        UPDATE users u
        JOIN service_requests sr ON sr.user_id = u.user_id
        SET u.name = ?, u.phone = ?
        WHERE sr.request_id = ?
    `;

    return db.query(sql, [customerName, customerPhone, requestId]);
},

/**
 * Update the service request's service_type / address / status.
 *
 * @param {number|string} requestId
 * @param {string} serviceType
 * @param {string} location
 * @param {string} status
 */
async updateRequestDetails(requestId, serviceType, location, status) {
    const sql = `
        UPDATE service_requests
        SET service_type_id = (
            SELECT service_type_id FROM service_types
            WHERE name = ? LIMIT 1
        ),
        address = ?,
        status = ?,
        updated_at = NOW()
        WHERE request_id = ?
    `;

    return db.query(sql, [serviceType, location, status, requestId]);
},
// requestController.js — new customerCancel path
async customerCancel(requestId, reason) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE service_requests
             SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = ?, updated_at = NOW()
             WHERE request_id = ?`,
            [reason || 'Cancelled by customer', requestId]
        );

        // close out whatever assignment was open, if any
        await conn.query(
            `UPDATE driver_assignments
             SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW()
             WHERE request_id = ? AND status NOT IN ('completed','cancelled')`,
            [reason || 'Cancelled by customer', requestId]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
},

// driver bails -> request survives, goes back to pending
async driverReleaseAssignment(requestId, driverId, reason) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE driver_assignments
             SET status = 'cancelled', cancellation_reason = ?, updated_at = NOW()
             WHERE request_id = ? AND driver_id = ? AND status NOT IN ('completed','cancelled')`,
            [reason || 'Cancelled by driver', requestId, driverId]
        );

        await conn.query(
            `UPDATE service_requests
             SET status = 'pending', driver_id = NULL, updated_at = NOW()
             WHERE request_id = ? AND driver_id = ?`,
            [requestId, driverId]
        );

        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
},
// requestModel.js

async claimAndAssign(requestId, driverId) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [updateResult] = await conn.query(
            `UPDATE service_requests
             SET driver_id = ?, status = 'assigned', updated_at = NOW()
             WHERE request_id = ? AND driver_id IS NULL AND status = 'pending'`,
            [driverId, requestId]
        );

        if (updateResult.affectedRows === 0) {
            await conn.rollback();
            return { claimed: false };
        }

        await conn.query(
            `INSERT INTO driver_assignments (request_id, driver_id, status, accepted_at)
             VALUES (?, ?, 'accepted', NOW())`,
            [requestId, driverId]
        );

        await conn.commit();
        return { claimed: true };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
},

// admin override: same insert, but bypasses the availability check
// (the transaction body is identical to claimAndAssign — call it directly)

async findPendingUnassignedForDriver(driverId) {

    const sql = `
        SELECT
            r.request_id, u.name AS customer_name, u.phone AS customer_phone,
            st.name AS service_type, v.vehicle_type, v.license_plate,
            r.address AS location, r.location_lat, r.location_lng,
            r.status, r.created_at
        FROM service_requests r
        JOIN users u ON r.user_id = u.user_id
        LEFT JOIN service_types st ON r.service_type_id = st.service_type_id
        LEFT JOIN vehicles v ON r.vehicle_id = v.vehicle_id
        WHERE r.status = 'pending' AND r.driver_id IS NULL
          AND (
            NOT EXISTS (SELECT 1 FROM driver_availability da WHERE da.driver_id = ? AND da.is_active = 1)
            OR EXISTS (
                SELECT 1 FROM driver_availability da
                WHERE da.driver_id = ?
                  AND da.is_active = 1
                  AND da.day_of_week = DAYOFWEEK(NOW()) - 1
                  AND CURTIME() BETWEEN da.start_time AND da.end_time
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM driver_assignments prev
            WHERE prev.request_id = r.request_id
              AND prev.driver_id = ?
              AND prev.status = 'cancelled'
          )
        ORDER BY r.created_at ASC
    `;
    return db.query(sql, [driverId, driverId, driverId]);
},
async addAdditionalCharge({
    request_id,
    description,
    amount,
    added_by
}) {
    if (!request_id) {
        throw new Error('request_id is required');
    }

    if (!description || !description.trim()) {
        throw new Error('description is required');
    }

    const chargeAmount = Number(amount);

    if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
        throw new Error('Please provide a valid charge amount');
    }

    const checkSql = `
        SELECT request_id, status
        FROM service_requests
        WHERE request_id = ?
        LIMIT 1
    `;

    const checkResult = await db.query(checkSql, [request_id]);
    const checkRows = Array.isArray(checkResult[0])
        ? checkResult[0]
        : checkResult;

    const request = checkRows[0];

    if (!request) {
        throw new Error('Service request not found');
    }

    if (!['assigned', 'in progress'].includes(request.status)) {
        throw new Error(
            request.status === 'completed'
                ? 'Cannot add charges to a completed job.'
                : `Cannot add charges while job status is "${request.status}".`
        );
    }

    const insertSql = `
        INSERT INTO additional_charges
        (request_id, description, amount, added_by, created_at)
        VALUES (?, ?, ?, ?, NOW())
    `;

    await db.query(insertSql, [
        request_id,
        description.trim(),
        chargeAmount,
        added_by || null
    ]);

    const updateSql = `
        UPDATE service_requests
        SET total_amount = base_amount + (
            SELECT COALESCE(SUM(ac.amount), 0)
            FROM additional_charges ac
            WHERE ac.request_id = ?
        ),
        updated_at = NOW()
        WHERE request_id = ?
    `;

    await db.query(updateSql, [request_id, request_id]);

    return true;
}
,
};//const Request



module.exports = Request;