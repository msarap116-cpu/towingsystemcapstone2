//paymentRoutes.js

const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');

const authenticateToken = require('../middleware/authMiddleware');

const Payment = require('../models/paymentModel');

const upload = require('../middleware/upload');

const Notification = require('../models/notificationModel');

const db = require('../database/database');


router.get('/:paymentId/receipt', authenticateToken, paymentController.downloadReceipt);
//03:21-082726
router.post(
    '/gcash/start',
    authenticateToken,
    async (req, res) => {
        try {
            const { request_id } = req.body;
            const userId = req.user.id;

            if (!request_id) {
                return res.status(400).json({
                    success: false,
                    message: 'request_id is required.'
                });
            }

            const request = await Payment.getRequestPaymentInfo(request_id, userId);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found.'
                });
            }

            const amount = Number(request.total_amount ?? request.amount ?? 0);

            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'The service fee has not been assigned yet.'
                });
            }

            const existingPayment = await Payment.findActivePayment(request_id, userId);

            if (existingPayment) {
                // ✅ Already paid
                if (existingPayment.status === 'completed') {
                    return res.json({
                        success: true,
                        payment: existingPayment,
                        existing: true,
                        message: 'This request has already been paid.'
                    });
                }

                // ✅ Admin is verifying — don't let them re-submit
                if (existingPayment.status === 'pending') {
                    return res.status(409).json({
                        success: false,
                        message: 'Proof has already been submitted and is awaiting verification.'
                    });
                }

                // ✅ REJECTED/FAILED — reset this SAME record for a fresh attempt
                if (
                    existingPayment.status === 'failed' ||
                    existingPayment.status === 'rejected' ||
                    existingPayment.status === 'refunded'
                ) {
                    await db.query(
                        `UPDATE payments
                         SET status = 'awaiting_payment',
                             payment_method = 'gcash',
                             amount = ?,
                             reference_number = NULL,
                             proof_image_path = NULL,
                             updated_at = NOW()
                         WHERE payment_id = ?`,
                        [amount, existingPayment.payment_id]
                    );

                    const payment = {
                        ...existingPayment,
                        amount,
                        payment_method: 'gcash',
                        status: 'awaiting_payment',
                        reference_number: null,
                        proof_image_path: null
                    };

                    return res.json({
                        success: true,
                        payment,
                        existing: true,
                        message: 'You may now submit a new proof of payment.'
                    });
                }

                // ✅ awaiting_payment or awaiting_cash — self-heal and reuse
                await db.query(
                    `UPDATE payments
                     SET amount = ?,
                         payment_method = 'gcash',
                         status = 'awaiting_payment',
                         updated_at = NOW()
                     WHERE payment_id = ?`,
                    [amount, existingPayment.payment_id]
                );

                return res.json({
                    success: true,
                    payment: {
                        ...existingPayment,
                        amount,
                        payment_method: 'gcash',
                        status: 'awaiting_payment'
                    },
                    existing: true
                });
            }

            // ✅ No existing payment — create a fresh one
            const paymentId = await Payment.createPaymentIntent({
                requestId: request.request_id,
                userId,
                amount
            });

            const payment = {
                payment_id: paymentId,
                request_id: request.request_id,
                user_id: userId,
                amount,
                payment_method: 'gcash',
                status: 'awaiting_payment'
            };

            return res.json({ success: true, payment, existing: false });

        } catch (error) {
            console.error('Start GCash payment error:', error);
            return res.status(500).json({
                success: false,
                message: 'Unable to start GCash payment.',
                debug_error: error.message,
                debug_stack: error.stack
            });
        }
    }
);
// paymentRoute.js
router.post(
    '/cash',
    authenticateToken,
    async (req, res) => {

        try {

            const { request_id } = req.body;
            const userId = req.user.id;

            if (!request_id) {
                return res.status(400).json({
                    success: false,
                    message: 'request_id is required.'
                });
            }

            // Confirm that the request belongs to this customer
            const request =
                await Payment.getRequestPaymentInfo(
                    request_id,
                    userId
                );

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Request not found or does not belong to you.'
                });
            }

            // Check whether a payment already exists
            const existingPayment =
                await Payment.getPaymentByRequest(
                    request_id,
                    userId
                );

            if (existingPayment) {

                if (existingPayment.status === 'completed') {
                    return res.status(409).json({
                        success: false,
                        message: 'This request has already been paid.',
                        payment: existingPayment
                    });
                }

                if (
                    existingPayment.payment_method === 'cash' &&
                    existingPayment.status === 'awaiting_cash'
                ) {
                    return res.json({
                        success: true,
                        message: 'Cash payment is already selected.',
                        payment: existingPayment,
                        existing: true
                    });
                }

                if (existingPayment.status === 'pending') {
                    // proof already submitted for gcash, awaiting admin review — don't let them switch silently
                    return res.status(409).json({
                        success: false,
                        message: 'A payment proof is already awaiting verification for this request.',
                        payment: existingPayment
                    });
                }

                // Any other incomplete payment (e.g. abandoned gcash intent, status 'awaiting_payment')
                // can be switched over to cash.
                await Payment.switchToCash(existingPayment.payment_id, request_id);

                const payment = {
                    ...existingPayment,
                    amount: Number(request.total_amount),
                    payment_method: 'cash',
                    status: 'awaiting_cash'
                };
                if (request.driver_id) {
                    await Notification.create({
                        userId: request.driver_id,
                        requestId: request_id,
                        type: 'payment',
                        message: `Customer selected cash payment for request #${request_id}.`
                    });
                }

                return res.json({
                    success: true,
                    message: 'Cash payment selected successfully.',
                    payment,
                    existing: false
                });
            }
            // Create cash payment
            const paymentId =
                await Payment.createCashPayment({
                    requestId: request.request_id,
                    userId,
                    amount: Number(request.total_amount)   // was request.amount
                });

            const payment = {
                payment_id: paymentId,
                request_id: request.request_id,
                user_id: userId,
                amount: Number(request.total_amount),   // was request.amount
                payment_method: 'cash',
                status: 'awaiting_cash'
            };

            // Notify the driver
            if (request.driver_id) {

                await Notification.create({
                    userId: request.driver_id,
                    requestId: request_id,
                    type: 'payment',
                    message:
                        `Customer selected cash payment for request #${request_id}.`
                });
            }

            return res.json({
                success: true,
                message:
                    'Cash payment selected successfully.',
                payment,
                existing: false
            });

        } catch (error) {

            console.error(
                'Cash payment error:',
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    'Unable to process cash payment.'
            });
        }
    }
);
router.post(
    '/gcash/submit-proof',
    authenticateToken,
    upload.single('proof_image'),
    async (req, res) => {
        try {
            const {
                request_id,
                reference_number
            } = req.body;

            const userId = req.user.id;

            if (!request_id || !reference_number || !req.file) {
                return res.status(400).json({
                    success: false,
                    message:
                        'request_id, reference_number, and proof image are required.'
                });
            }

            // Confirm that this service request belongs to the customer
            const request =
                await Payment.getRequestPaymentInfo(
                    request_id,
                    userId
                );

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Request not found or does not belong to you.'
                });
            }

            // Check the existing payment record
            const existingPayment =
                await Payment.getPaymentByRequest(
                    request_id,
                    userId
                );

            if (!existingPayment) {
                return res.status(404).json({
                    success: false,
                    message:
                        'Payment record not found. Please start the GCash payment first.'
                });
            }

            if (existingPayment.status === 'completed') {
                return res.status(409).json({
                    success: false,
                    message:
                        'This request has already been paid.'
                });
            }

            if (existingPayment.status === 'pending') {
                return res.status(409).json({
                    success: false,
                    message:
                        'Proof has already been submitted and is awaiting verification.'
                });
            }

            if (existingPayment.status !== 'awaiting_payment') {
                return res.status(409).json({
                    success: false,
                    message:
                        'This payment is not available for proof submission.'
                });
            }

            // Update the existing payment record
            const result =
                await Payment.submitProof({
                    requestId: request_id,
                    userId,
                    referenceNumber: reference_number,
                    proofImagePath: req.file.path
                });

            await Notification.createForRole('admin', {
                requestId: request_id,
                type: 'payment',
                message: `New GCash payment proof submitted for request #${request_id}, awaiting verification.`
            });

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    message:
                        'Payment was already submitted or is no longer available.'
                });
            }

            return res.json({
                success: true,
                message:
                    'Proof of payment submitted. Awaiting verification.'
            });

       } catch (error) {
    console.error('Proof submission error:', error);
    return res.status(500).json({
        success: false,
        message: 'Failed to submit proof of payment.',
        debug_error: error.message,   // <-- ADD THIS
        debug_stack: error.stack      // <-- ADD THIS
    });
}
    }
);



router.get(
    '/pending',
    authenticateToken,
    async (req, res) => {

        try {

            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required.'
                });
            }

            const payments =
                await Payment.getPendingPayments();

            res.json({
                success: true,
                payments
            });

        } catch (error) {

            console.error(
                'Get pending payments error:',
                error
            );

            res.status(500).json({
                success: false,
                message: 'Failed to load pending payments.'
            });
        }
    }
);
router.put(
    '/:paymentId/approve',
    authenticateToken,
    async (req, res) => {

        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required.'
                });
            }

            const { paymentId } = req.params;

            const payment =
                await Payment.getPaymentById(paymentId);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found.'
                });
            }

            if (payment.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: `Payment is already ${payment.status}.`
                });
            }

            const receiptNumber =
                `TTR-${new Date().getFullYear()}-${String(paymentId).padStart(6, '0')}`;

            await Payment.approvePayment(
                paymentId,
                receiptNumber
            );
            const result = await Payment.approvePayment(paymentId, receiptNumber);

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Payment could not be confirmed. It may have already been processed.'
                });
            }

            await Notification.create({
                userId: payment.user_id,
                requestId: payment.request_id,
                type: 'payment',
                message: `Your payment of ₱${payment.amount} has been approved. Receipt: ${receiptNumber}`
            });

            return res.json({
                success: true,
                message: 'Payment approved successfully.',
                receipt_number: receiptNumber
            });



        } catch (error) {

            console.error(
                'Payment approval error:',
                error
            );

            return res.status(500).json({
                success: false,
                message: 'Failed to approve payment.'
            });
        }
    }
);
// DRIVER CONFIRMS CASH RECEIVED
router.put(
    '/:paymentId/cash-received',
    authenticateToken,
    async (req, res) => {
        try {
            if (req.user.role !== 'driver') {
                return res.status(403).json({
                    success: false,
                    message: 'Driver access required.'
                });
            }

            const { paymentId } = req.params;

            const payment = await Payment.getPaymentById(paymentId);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found.'
                });
            }

            if (payment.payment_method !== 'cash') {
                return res.status(400).json({
                    success: false,
                    message: 'This payment is not a cash payment.'
                });
            }

            if (payment.status !== 'awaiting_cash') {
                return res.status(400).json({
                    success: false,
                    message: `Payment is already ${payment.status}.`
                });
            }

            const receiptNumber =
                `TTR-${new Date().getFullYear()}-${String(payment.payment_id).padStart(6, '0')}`;


            const result = await Payment.approvePayment(paymentId, receiptNumber);

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Payment could not be confirmed. It may have already been processed.'
                });
            }

            await Notification.create({
                userId: payment.user_id,
                requestId: payment.request_id,
                type: 'payment',
                message: `Your cash payment of ₱${payment.amount} has been confirmed. Receipt: ${receiptNumber}`
            });

            return res.json({
                success: true,
                message: 'Cash payment confirmed.',
                receipt_number: receiptNumber
            });

        } catch (error) {
            console.error('Cash confirmation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to confirm cash payment.'
            });
        }
    }
);
router.get('/driver/mine', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({
                success: false,
                message: 'Driver access required.'
            });
        }

        const driverId = req.user.id;
        const payments = await Payment.getPaymentsByDriver(driverId);

        res.json(payments);

    } catch (err) {
        console.error('Failed to fetch driver payments:', err);
        res.status(500).json({ message: 'Failed to fetch payments' });
    }
});

//11:11-082626
router.get('/mine', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; // GoodWrenchmatches JWT payload { id, role, sessionId, ... }
        const payments = await Payment.getPaymentsByUser(userId);
        res.json(payments);
    } catch (err) {
        console.error('Failed to fetch user payments:', err);
        res.status(500).json({ message: 'Failed to fetch receipts' });
    }
});
router.get(
    '/:paymentId',
    authenticateToken,
    async (req, res) => {
        try {
            console.log('🔎 PAYMENT ID FROM URL:', req.params.paymentId);

            // 1. Fetch the payment record first
            const payment = await Payment.getPaymentById(req.params.paymentId);

            console.log('🔎 PAYMENT FROM MODEL:', payment);

            // 2. Check if the payment exists
            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found.'
                });
            }

            // 3. Authorize AFTER confirming the payment exists
            const isAdmin = req.user.role === 'admin';
            const isOwner = String(payment.user_id) === String(req.user.id);

            if (!isAdmin && !isOwner) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view this payment.'
                });
            }

            // 4. Return response
            return res.json({
                success: true,
                payment
            });

        } catch (error) {
            console.error('Get payment error:', error);

            return res.status(500).json({
                success: false,
                message: 'Failed to load payment.'
            });
        }
    }
);
router.get(
    '/request/:requestId',
    authenticateToken,
    async (req, res) => {

        try {

            const { requestId } = req.params;
            const userId = req.user.id;

            const payment =
                await Payment.getPaymentByRequest(
                    requestId,
                    userId
                );

            if (!payment) {
                return res.json({
                    success: true,
                    payment: null
                });
            }

            res.json({
                success: true,
                payment
            });

        } catch (error) {

            console.error(
                'Get request payment error:',
                error
            );

            res.status(500).json({
                success: false,
                message: 'Failed to load payment.'
            });
        }
    },


);



module.exports = router;