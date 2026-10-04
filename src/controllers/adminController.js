// adminController.js
const bcrypt = require('bcryptjs');
const db = require('../database/database');
const Admin = require('../models/adminModel');
const Request = require('../models/requestModel');
const Notification = require('../models/notificationModel');
const { notifyUser, notifyRole } = require('../utils/notify');
// console.log("RUNNING NEW QUERY");


exports.getDrivers = async (req, res) => {
    try {
        const drivers = await Admin.getDrivers();
        console.log("Drivers from DB:", drivers.length, "rows");
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getCustomers = async (req, res) => {
    try {
        const customers = await Admin.getCustomers();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.getPayments = async (req, res) => {
    try {
        const payments = await Admin.getPayments();
        res.json(payments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Admin.deletePayment(id);

        if (!result.affectedRows) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        res.json({ message: 'Payment deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


exports.getRequests = async (req, res) => {
    try {
        const requests = await Admin.getRequests();
        console.log("SAMPLE ROW:", requests[0]);   // temporary
        res.json(requests);
    } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ message: err.message });
    }
};


exports.getStatistics = async (req, res) => {

    try {

        const stats = await Admin.getStatistics();

        res.json(stats[0]);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

};


// Add these at the END of your existing adminController.js


// Create new request
exports.createRequest = async (req, res) => {
    try {
        const { customer_name, customer_phone, location, service_type, status } = req.body;

        // Find existing customer by phone
        const [existing] = await db.query(
            `SELECT user_id FROM users WHERE phone = ? AND role = 'customer' LIMIT 1`,
            [customer_phone]
        );

        let userId;
        if (existing.length > 0) {
            userId = existing[0].user_id;
            await db.query(`UPDATE users SET name = ? WHERE user_id = ?`, [customer_name, userId]);
        } else {
            // Create new customer
            const [newUser] = await db.query(
                `INSERT INTO users (name, phone, role, created_at) VALUES (?, ?, 'customer', NOW())`,
                [customer_name, customer_phone]
            );
            userId = newUser.insertId;
        }

        const [service] = await db.query(
            `SELECT service_type_id FROM service_types WHERE name = ? LIMIT 1`,
            [service_type]
        );
        const serviceId = service[0]?.service_type_id || null;

        const [result] = await db.query(
            `INSERT INTO service_requests (user_id, address, service_type_id, status, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
            [userId, location, serviceId, status]
        );

        res.status(201).json({ id: result.insertId, message: "Request saved" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create request" });
    }
};

// Update existing request
exports.updateRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_name, customer_phone, location, service_type, status } = req.body;
        const sql = `
      UPDATE service_requests
      SET address = ?, service_type_id = (SELECT service_type_id FROM service_types WHERE name = ?), status = ?
      WHERE request_id = ?
    `;
        await db.query(sql, [location, service_type, status, id]);
        res.json({ message: "Request updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update request" });
    }
};

// Create new driver
exports.createDriver = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            name,
            phone,
            email,
            password,
            status
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Driver name is required'
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Driver email is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Driver password is required'
            });
        }

        await connection.beginTransaction();

        // Check duplicate email
        const [existingUser] = await connection.query(`
            SELECT user_id
            FROM users
            WHERE email = ?
            LIMIT 1
        `, [email.trim()]);

        if (existingUser.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Email is already registered'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user account
        const [userResult] = await connection.query(`
            INSERT INTO users (
                name,
                email,
                phone,
                role,
                password,
                created_at
            )
            VALUES (?, ?, ?, 'driver', ?, NOW())
        `, [
            name.trim(),
            email.trim(),
            phone || null,
            hashedPassword
        ]);

        const userId = userResult.insertId;

        // Create driver record
        await connection.query(`
            INSERT INTO drivers (
                user_id,
                status,
                rating,
                total_completed
            )
            VALUES (?, ?, 5.00, 0)
        `, [
            userId,
            status || 'offline'
        ]);

        await connection.commit();

        console.log(
            `Driver created: user_id=${userId}`
        );

        res.status(201).json({
            success: true,
            id: userId,
            message: 'Driver account created successfully'
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            'Create driver error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to create driver',
            error: error.message
        });

    } finally {
        connection.release();
    }
};

// Update driver
exports.updateDriver = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        const {
            name,
            phone,
            email,
            password,
            status
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Driver name is required'
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Driver email is required'
            });
        }

        await connection.beginTransaction();

        // Check if email belongs to another user
        const [existingEmail] = await connection.query(`
            SELECT user_id
            FROM users
            WHERE email = ?
            AND user_id != ?
            LIMIT 1
        `, [
            email.trim(),
            id
        ]);

        if (existingEmail.length > 0) {
            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Email is already used by another account'
            });
        }

        // Update basic user information
        await connection.query(`
            UPDATE users
            SET
                name = ?,
                phone = ?,
                email = ?
            WHERE user_id = ?
            AND role = 'driver'
        `, [
            name.trim(),
            phone || null,
            email.trim(),
            id
        ]);

        // Update password only if provided
        if (password && password.trim()) {

            const hashedPassword =
                await bcrypt.hash(password, 10);

            await connection.query(`
                UPDATE users
                SET password = ?
                WHERE user_id = ?
                AND role = 'driver'
            `, [
                hashedPassword,
                id
            ]);
        }

        // Update driver status
        await connection.query(`
            UPDATE drivers
            SET status = ?
            WHERE user_id = ?
        `, [
            status || 'offline',
            id
        ]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Driver updated successfully'
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            'Update driver error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update driver',
            error: error.message
        });

    } finally {
        connection.release();
    }
};
// Create customer
exports.createCustomer = async (req, res) => {
    try {
        const { name, phone, email } = req.body;
        const sql = `
      INSERT INTO users (name, phone, email, role, created_at)
      VALUES (?, ?, ?, 'customer', NOW())
    `;
        const [result] = await db.query(sql, [name, phone, email]);
        res.status(201).json({ id: result.insertId, message: "Customer added" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add customer" });
    }
};

// Update customer
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, email } = req.body;
        await db.query(`
      UPDATE users SET name = ?, phone = ?, email = ? WHERE user_id = ?
    `, [name, phone, email, id]);
        res.json({ message: "Customer updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update customer" });
    }
};

// Mark payment as paid
exports.markPaymentPaid = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`
      UPDATE payments SET status = 'paid', paid_at = NOW() WHERE request_id = ?
    `, [id]);
        res.json({ message: "Payment marked as paid" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update payment" });
    }
};
// Delete request
exports.deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;

        // Optional: Add checks if you want to prevent deleting completed/paid requests
        // const [check] = await db.query(`SELECT status FROM service_requests WHERE request_id = ?`, [id]);
        // if (check[0]?.status === 'completed') {
        //     return res.status(400).json({ message: "Cannot delete completed requests" });
        // }

        await db.query(`DELETE FROM service_requests WHERE request_id = ?`, [id]);
        res.json({ message: "Request deleted successfully" });
    } catch (err) {
        console.error("Delete request error:", err);
        res.status(500).json({ message: "Failed to delete request" });
    }
};

exports.getMapData = async (req, res) => {
    try {

        const [requests] = await db.query(`
            SELECT
                sr.request_id,
                sr.user_id,
                u.name AS customer_name,
                u.phone AS customer_phone,
                sr.service_type,
                sr.vehicle_type,
                sr.address,
                sr.location_lat,
                sr.location_lng,
                sr.status,
                sr.created_at
            FROM service_requests sr
            JOIN users u
                ON sr.user_id = u.user_id
            WHERE sr.status = 'pending'
              AND sr.location_lat IS NOT NULL
              AND sr.location_lng IS NOT NULL
            ORDER BY sr.created_at DESC
        `);

        const [drivers] = await db.query(`
            SELECT
                u.user_id AS driver_id,
                u.name AS driver_name,
                dl.latitude,
                dl.longitude,
                dl.status
            FROM users u
            JOIN driver_locations dl
                ON u.user_id = dl.driver_id
            WHERE u.role = 'driver'
              AND dl.latitude IS NOT NULL
              AND dl.longitude IS NOT NULL
        `);

        res.json({
            requests,
            drivers
        });

    } catch (error) {
        console.error('Map data error:', error);

        res.status(500).json({
            message: 'Failed to load map data'
        });
    }
};

exports.deleteDriver = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // Delete vehicle
        await connection.query(`
            DELETE FROM vehicles
            WHERE user_id = ?
        `, [id]);

        // Delete driver
        await connection.query(`
            DELETE FROM drivers
            WHERE user_id = ?
        `, [id]);

        // Delete user
        await connection.query(`
            DELETE FROM users
            WHERE user_id = ?
            AND role = 'driver'
        `, [id]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Driver deleted successfully'
        });

    } catch (err) {
        await connection.rollback();

        console.error('Delete driver error:', err);

        res.status(500).json({
            success: false,
            message: 'Failed to delete driver',
            error: err.message
        });

    } finally {
        connection.release();
    }
};
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM users WHERE user_id = ?',
            [id]
        );

        console.log('Delete result:', result);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Customer not found'
            });
        }

        return res.json({
            message: 'Customer deleted'
        });
    } catch (err) {
        console.error('Delete customer error:', err);

        return res.status(500).json({
            message: 'Failed to delete customer'
        });
    }
};

exports.createAdmin = async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            name,
            phone,
            email,
            password
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Admin name is required'
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Admin email is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Admin password is required'
            });
        }

        await connection.beginTransaction();

        // Check duplicate email
        const [existingUser] = await connection.query(`
            SELECT user_id
            FROM users
            WHERE email = ?
            LIMIT 1
        `, [
            email.trim()
        ]);

        if (existingUser.length > 0) {

            await connection.rollback();

            return res.status(409).json({
                success: false,
                message: 'Email is already registered'
            });
        }

        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Create admin account
        const [userResult] = await connection.query(`
            INSERT INTO users (
                name,
                email,
                phone,
                role,
                password,
                created_at
            )
            VALUES (?, ?, ?, 'admin', ?, NOW())
        `, [
            name.trim(),
            email.trim(),
            phone || null,
            hashedPassword
        ]);

        await connection.commit();

        console.log(
            `Admin created: user_id=${userResult.insertId}`
        );

        res.status(201).json({
            success: true,
            id: userResult.insertId,
            message: 'Admin account created successfully'
        });

    } catch (error) {

        await connection.rollback();

        console.error(
            ' Create admin error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to create admin',
            error: error.message
        });

    } finally {

        connection.release();
    }
};
exports.getAdmins = async (req, res) => {
    try {
        const admins = await db.query(`
            SELECT
                user_id AS id,
                name,
                phone,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE role = 'admin'
            ORDER BY user_id DESC
        `);

        console.log("ADMINS FROM DATABASE:", admins);

        res.json({
            success: true,
            admins: admins
        });

    } catch (error) {
        console.error("Get admins error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load admins"
        });
    }
};

// exports.assignDriver = async (req, res) => {

//     const requestId = req.params.id;
//     const { driver_id } = req.body;

//     if (!driver_id) {
//         return res.status(400).json({
//             error: 'Driver ID is required'
//         });
//     }

//     try {

//         // Check request
//         const [requests] = await db.query(
//             `SELECT
//                 request_id,
//                 user_id,
//                 driver_id,
//                 status
//              FROM service_requests
//              WHERE request_id = ?`,
//             [requestId]
//         );

//         if (!requests || requests.length === 0) {
//             return res.status(404).json({
//                 error: 'Request not found'
//             });
//         }

//         const request = requests[0];

//         // Don't overwrite an existing assignment
//         if (request.driver_id) {
//             return res.status(400).json({
//                 error: 'This request is already assigned to a driver'
//             });
//         }

//         // Only pending requests
//         if (request.status !== 'pending') {
//             return res.status(400).json({
//                 error: `Request is already ${request.status}`
//             });
//         }

//         // Check driver
//         const [drivers] = await db.query(
//             `SELECT
//                 user_id,
//                 name,
//                 role
//              FROM users
//              WHERE user_id = ?
//              AND role = 'driver'`,
//             [driver_id]
//         );

//         if (!drivers || drivers.length === 0) {
//             return res.status(404).json({
//                 error: 'Driver not found'
//             });
//         }

//         // Assign driver
//         await db.query(
//             `UPDATE service_requests
//              SET
//                 driver_id = ?,
//                 status = 'assigned',
//                 updated_at = NOW()
//              WHERE request_id = ?`,
//             [driver_id, requestId]
//         );

//         res.json({
//             success: true,
//             message: 'Driver assigned successfully',
//             request_id: requestId,
//             driver_id: driver_id
//         });

//     } catch (err) {

//         console.error('Admin assign driver error:', err);

//         res.status(500).json({
//             error: err.message
//         });
//     }
// };
exports.assignDriver = async (req, res) => {
    const requestId = req.params.id;
    const { driver_id } = req.body;

    if (!driver_id) {
        return res.status(400).json({ error: 'Driver ID is required' });
    }

    try {
        // 1. Find request
        const result = await db.query(
            `SELECT request_id, user_id, driver_id, status FROM service_requests WHERE request_id = ?`,
            [requestId]
        );
        const requests = Array.isArray(result[0]) ? result[0] : result;
        if (!requests || requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }
        const request = requests[0];

        if (request.driver_id) {
            return res.status(400).json({ error: 'This request is already assigned to a driver' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ error: `Request is already ${request.status}` });
        }

        // 2. Find driver
        const driverResult = await db.query(
            `SELECT user_id, name, phone, role FROM users WHERE user_id = ? AND role = 'driver'`,
            [driver_id]
        );
        const drivers = Array.isArray(driverResult[0]) ? driverResult[0] : driverResult;
        if (!drivers || drivers.length === 0) {
            return res.status(404).json({ error: 'Driver not found' });
        }
        const driver = drivers[0];

        // 3. Same transactional claim used by the driver-accept flow
        const { claimed } = await Request.claimAndAssign(requestId, driver_id);
        if (!claimed) {
            return res.status(409).json({ error: 'Request was already claimed by another driver' });
        }

        // 4. Notify — fixed to use real variables
        await Notification.create({
            userId: driver_id,
            requestId,
            type: 'order',
            message: `You've been assigned to service request #${requestId}.`
        });
        await Notification.create({
            userId: request.user_id,
            requestId,
            type: 'order',
            message: `A driver has been assigned to your request #${requestId}.`
        });

        res.json({
            success: true,
            message: 'Driver assigned successfully',
            request_id: Number(requestId),
            driver_id: Number(driver_id),
            driver_name: driver.name
        });

    } catch (err) {
        console.error('ADMIN ASSIGN DRIVER ERROR:', err.message);
        res.status(500).json({ error: err.message || 'Failed to assign driver' });
    }
};
exports.getAvailableDrivers = async (req, res) => {
    try {
        const drivers = await Admin.getAvailableDrivers();

        console.log('Drivers from DB:', drivers.length, 'rows');

        res.json(drivers);

    } catch (err) {
        console.error('Error fetching available drivers:', err);

        res.status(500).json({
            error: 'Failed to fetch available drivers'
        });
    }
};

exports.getServiceTypes = async (req, res) => {

    try {

        const services = await Admin.getServiceTypes();

        console.log('🔎 Controller services:', services);
        console.log('🔎 Is array:', Array.isArray(services));
        console.log('🔎 Count:', services.length);

        res.json({
            services: services
        });

    } catch (error) {

        console.error('Get service types error:', error);

        res.status(500).json({
            message: 'Failed to load service types'
        });
    }
};

exports.updateServicePrice = async (req, res) => {
    try {

        const serviceTypeId = req.params.id;
        const { base_price } = req.body;

        const price = Number(base_price);

        if (!Number.isFinite(price) || price < 0) {
            return res.status(400).json({
                message: 'Invalid price'
            });
        }

        const result = await Admin.updateServicePrice(
            serviceTypeId,
            price
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Service type not found'
            });
        }

        res.json({
            message: 'Service price updated successfully'
        });

    } catch (error) {

        console.error('Update service price error:', error);

        res.status(500).json({
            message: 'Failed to update service price'
        });
    }
};