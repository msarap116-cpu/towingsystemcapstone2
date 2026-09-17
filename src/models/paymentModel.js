


//paymentModel.js

const db = require('../database/database');

const Payment = {

    async getRequestPaymentInfo(requestId, userId) {

        const sql = `
    SELECT
        request_id,
        user_id,
        status,
        address,
        amount
    FROM service_requests
    WHERE request_id = ?
      AND user_id = ?
    LIMIT 1
`;

        const result = await db.query(
            sql,
            [requestId, userId]
        );

        const rows = Array.isArray(result[0])
            ? result[0]
            : result;

        return rows[0] || null;
    },


    async createPendingPayment({
    requestId,
    userId,
    amount,
    referenceNumber,
    proofImagePath
}) {

    const sql = `
        INSERT INTO payments (
            request_id,
            user_id,
            amount,
            payment_method,
            transaction_id,
            reference_number,
            proof_image_path,
            status
        )
        VALUES (?, ?, ?, 'gcash', ?, ?, ?, 'pending')
    `;

    return await db.query(sql, [
        requestId,
        userId,
        amount,
        referenceNumber,
        referenceNumber,
        proofImagePath
    ]);
},

    async getPaymentById(paymentId) {

        const sql = `
        SELECT
            p.*,
            u.name AS customer_name
        FROM payments p
        LEFT JOIN users u
            ON u.user_id = p.user_id
        WHERE p.payment_id = ?
        LIMIT 1
    `;

        const rows = await db.query(sql, [paymentId]);

        console.log('🔎 getPaymentById:', paymentId);
        console.log('🔎 Payment rows:', rows);

       return rows[0] || null;
    },

async approvePayment(paymentId, receiptNumber) {

    const sql = `
        UPDATE payments
        SET
            status = 'completed',
            receipt_number = ?,
            payment_date = NOW(),
            updated_at = NOW()
        WHERE payment_id = ?
          AND status IN ('pending', 'awaiting_cash')
    `;

    const result = await db.query(sql, [
        receiptNumber,
        paymentId
    ]);

    return result;
},

    async getPendingPayments() {

        const sql = `
        SELECT
            p.payment_id,
            p.request_id,
            p.user_id,
            p.amount,
            p.payment_method,
            p.reference_number,
            p.transaction_id,
            p.status,
            p.proof_image_path,
            p.payment_date,
            u.name AS customer_name
        FROM payments p
        LEFT JOIN users u
            ON u.user_id = p.user_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
    `;

  const rows = await db.query(sql);
    return rows;
    },

    async getPaymentByRequest(requestId, userId) {
    const sql = `
        SELECT *
        FROM payments
        WHERE request_id = ?
          AND user_id = ?
        ORDER BY payment_id DESC
        LIMIT 1
    `;

    const rows = await db.query(sql, [requestId, userId]);

    return rows[0] || null;
},

async rejectPayment(paymentId, reason) {

    const sql = `
        UPDATE payments
        SET
            status = 'failed',
            notes = ?,
            updated_at = NOW()
        WHERE payment_id = ?
          AND status = 'pending'
    `;

    return await db.query(sql, [
        reason,
        paymentId
    ]);
},
async getPaymentsByUser(userId) {
    const sql = `
        SELECT
            p.*,
            u.name AS customer_name
        FROM payments p
        LEFT JOIN users u
            ON u.user_id = p.user_id
        WHERE p.user_id = ?
        ORDER BY p.payment_date DESC
    `;

    const rows = await db.query(sql, [userId]);

    console.log('🔎 getPaymentsByUser:', userId, rows.length);

    return rows;
},

async findActivePayment(requestId, userId) {
    const sql = `
        SELECT *
        FROM payments
        WHERE request_id = ?
          AND user_id = ?
          AND status IN (
              'awaiting_payment',
              'awaiting_cash',
              'pending',
              'completed'
          )
        ORDER BY payment_id DESC
        LIMIT 1
    `;

    const rows = await db.query(
        sql,
        [requestId, userId]
    );

    return rows[0] || null;
},

async createPaymentIntent({ requestId, userId, amount }) {
    const sql = `
        INSERT INTO payments (
            request_id,
            user_id,
            amount,
            payment_method,
            status
        )
        VALUES (?, ?, ?, 'gcash', 'awaiting_payment')
    `;

    const result = await db.query(sql, [requestId, userId, amount]);

    return result.insertId;
},
async createCashPayment({ requestId, userId, amount }) {

    const sql = `
        INSERT INTO payments (
            request_id,
            user_id,
            amount,
            payment_method,
            status
        )
        VALUES (?, ?, ?, 'cash', 'awaiting_cash')
    `;

    const result = await db.query(
        sql,
        [requestId, userId, amount]
    );

    return result.insertId;
},
async submitProof({
    requestId,
    userId,
    referenceNumber,
    proofImagePath
}) {
    const sql = `
        UPDATE payments
        SET
            reference_number = ?,
            transaction_id = ?,
            proof_image_path = ?,
            status = 'pending',
            payment_date = NOW()
        WHERE request_id = ?
          AND user_id = ?
          AND status = 'awaiting_payment'
    `;

    const result = await db.query(sql, [
        referenceNumber,
        referenceNumber,
        proofImagePath,
        requestId,
        userId
    ]);

    return result;
},
async switchToCash(paymentId) {
    const sql = `
        UPDATE payments
        SET payment_method = 'cash',
            status = 'awaiting_cash'
        WHERE payment_id = ?
    `;
    return db.query(sql, [paymentId]);
},
async getPaymentsByDriver(driverId) {
    const sql = `
        SELECT
            p.*,
            u.name AS customer_name,
            sr.driver_id
        FROM payments p
        JOIN service_requests sr
            ON sr.request_id = p.request_id
        LEFT JOIN users u
            ON u.user_id = p.user_id
        WHERE sr.driver_id = ?
        ORDER BY p.payment_date DESC
    `;

    const rows = await db.query(sql, [driverId]);

    return rows;
},

};



module.exports = Payment;