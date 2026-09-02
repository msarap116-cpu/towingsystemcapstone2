// models/adminModel.js
// This is where the commands for fetching admin data from the database are located.

// Last edited: 7/7/26 12:43

const db = require('../database/database');

const Admin = {

    // =========================================================
    // GET DRIVERS
    // Includes:
    // - Existing driver dashboard information
    // - Latest driver GPS location
    // - Current active request
    // - Map status: online / busy
    // =========================================================
    async getDrivers() {

        const sql = `
            SELECT
                dd.user_id AS id,
                dd.name,
                dd.phone,
                dd.email,
                dd.status,
                dd.rating,
                dd.total_completed,
                dd.vehicle_plate,
                dd.vehicle_type,
                dd.earnings_30d,

                -- Latest driver GPS location
                dl.lat,
                dl.lng,
                dl.recorded_at,

                -- Current active request
                sr.request_id,
                sr.status AS request_status,

                -- Status specifically for the map
                CASE
                    WHEN sr.request_id IS NOT NULL THEN 'busy'
                    ELSE 'online'
                END AS map_status

            FROM driver_dashboard AS dd

            -- Get the driver's latest GPS location
            LEFT JOIN driver_locations AS dl
                ON dl.driver_id = dd.user_id
                AND dl.recorded_at = (
                    SELECT MAX(dl2.recorded_at)
                    FROM driver_locations AS dl2
                    WHERE dl2.driver_id = dd.user_id
                )

            -- Find the driver's current active job
            LEFT JOIN service_requests AS sr
                ON sr.driver_id = dd.user_id
                AND sr.status IN ('assigned', 'in progress')

            ORDER BY dd.name ASC
        `;

        const result = await db.query(sql);

        // Standardize result handling
        const rows = Array.isArray(result[0])
            ? result[0]
            : Array.isArray(result)
                ? result
                : [];

        return rows;
    },


    async getCustomers() {

        const sql = `
            SELECT
                user_id AS id,
                name,
                phone,
                email,
                total_requests AS trips,
                total_spent,
                avg_rating
            FROM customer_directory
            ORDER BY user_id DESC
        `;

        const result = await db.query(sql);

        const rows = Array.isArray(result[0])
            ? result[0]
            : Array.isArray(result)
                ? result
                : [result];

        return rows;
    },

    async getPayments() {

        const sql = `
            SELECT
                p.payment_id,
                p.receipt_number AS receipt,
                p.request_id,
                u.name AS customer,
                p.amount,
                p.payment_method,
                p.payment_date,
                p.status
            FROM payments p
            LEFT JOIN users u
                ON p.user_id = u.user_id
            ORDER BY p.payment_date DESC
        `;

        const result = await db.query(sql);

        const rows = Array.isArray(result[0])
            ? result[0]
            : Array.isArray(result)
                ? result
                : [];

        return rows;
    },


    async getRequests() {
        const sql = `
            SELECT
    r.request_id,
    r.user_id,
    r.driver_id,

    u.name AS customer_name,
    u.phone AS customer_phone,

    dr.name AS driver_name,

    st.name AS service_name,

    v.vehicle_type,

    r.address AS location,

    r.location_lat,
    r.location_lng,

    r.status,
    r.created_at

        FROM service_requests r

        JOIN users u
            ON r.user_id = u.user_id

        LEFT JOIN users dr
            ON r.driver_id = dr.user_id

        LEFT JOIN service_types st
            ON r.service_type_id = st.service_type_id

        LEFT JOIN vehicles v
            ON r.vehicle_id = v.vehicle_id

        ORDER BY r.created_at DESC
    `;

        const result = await db.query(sql);

        const rows = Array.isArray(result[0])
            ? result[0]
            : Array.isArray(result)
                ? result
                : [];

        return rows;
    },


    async getStatistics() {

        const sql = `
            SELECT *
            FROM dashboard_stats
        `;

        const result = await db.query(sql);

        const rows = Array.isArray(result[0])
            ? result[0]
            : Array.isArray(result)
                ? result
                : [];

        return rows;
    },

    async getAvailableDrivers() {
    const sql = `
        SELECT
            user_id,
            name,
            phone
        FROM users
        WHERE role = 'driver'
        ORDER BY name ASC
    `;

    const result = await db.query(sql);

    const rows = Array.isArray(result[0])
        ? result[0]
        : Array.isArray(result)
            ? result
            : [];

    console.log('Drivers from DB:', rows.length, 'rows');

    return rows;
},



};


module.exports = Admin;