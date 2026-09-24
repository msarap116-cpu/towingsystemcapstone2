// adminRoutes.js
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authMiddleware');
const Payment = require('../models/paymentModel');
const requireAdmin = require('../middleware/adminMiddleware');
const Notification = require('../models/notificationModel');


router.get('/customers', authenticateToken, adminController.getCustomers);

router.get('/drivers', authenticateToken, adminController.getDrivers);

router.get('/requests', authenticateToken, adminController.getRequests);

router.get('/payments', authenticateToken, adminController.getPayments);

router.get('/statistics', authenticateToken, adminController.getStatistics);

router.put('/requests/:id', authenticateToken, adminController.updateRequest);

router.post('/requests', authenticateToken, adminController.createRequest);

router.put('/drivers/:id', authenticateToken, adminController.updateDriver);

router.post('/drivers', authenticateToken, adminController.createDriver);

router.put('/customers/:id', authenticateToken, adminController.updateCustomer);

router.post('/customers', authenticateToken, adminController.createCustomer);

router.patch('/payments/:id/mark-paid', authenticateToken, adminController.markPaymentPaid);

router.delete('/requests/:id', authenticateToken, adminController.deleteRequest);

router.delete('/customers/:id', authenticateToken, adminController.deleteCustomer);
router.delete(
    '/customers/:id',
    authenticateToken,
    adminController.deleteCustomer
);
router.delete('/payments/:id', authenticateToken, adminController.deletePayment);

// Service Types / Prices
router.get(
    '/service-types',
    authenticateToken,
    requireAdmin,
    adminController.getServiceTypes
);
router.get(
    '/drivers/available',
    authenticateToken,
    adminController.getAvailableDrivers
);

router.get(
    '/admins',
    authenticateToken,
    requireAdmin,
    adminController.getAdmins
);

router.put(
    '/service-types/:id/price',
    authenticateToken,
    requireAdmin,
    adminController.updateServicePrice
);
router.put(
    '/requests/:id/assign-driver',
    authenticateToken,
    adminController.assignDriver
);

router.post('/admins', adminController.createAdmin);


router.put(
    '/payments/:paymentId/approve',
    authenticateToken,
    async (req, res) => {

        try {
            console.log('🔐 APPROVE AUTH USER:', req.user);
            console.log('🔐 USER ROLE:', req.user?.role);

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
                    message:
                        `Payment is already ${payment.status}.`
                });
            }

            // Generate receipt number
            const receiptNumber =
                `TTR-${new Date().getFullYear()}-${String(payment.payment_id).padStart(6, '0')}`;

            await Payment.approvePayment(
                paymentId,
                receiptNumber
            );
            await Notification.create({
                userId: payment.user_id,
                requestId: payment.request_id,
                type: 'payment',
                message: `Your payment of ₱${payment.amount} has been approved. Receipt: ${receiptNumber}`
            });

            res.json({
                success: true,
                message: 'Payment approved successfully.',
                receipt_number: receiptNumber
            });

        } catch (error) {

            console.error(
                'Approve payment error:',
                error
            );

            res.status(500).json({
                success: false,
                message: 'Failed to approve payment.'
            });
        }
    }
);
router.put(
    '/payments/:paymentId/reject',
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

            const { reason } = req.body;

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
                    message:
                        `Payment is already ${payment.status}.`
                });
            }

            await Payment.rejectPayment(
                paymentId,
                reason || 'Payment proof was rejected.'
            ); await Notification.create({
                userId: payment.user_id,
                requestId: payment.request_id,
                type: 'payment',
                message: `Your payment proof was rejected. Reason: ${reason || 'Payment proof was rejected.'}`
            });

            res.json({
                success: true,
                message:
                    'Payment proof rejected. Customer may resubmit.'
            });

        } catch (error) {

            console.error(
                'Reject payment error:',
                error
            );

            res.status(500).json({
                success: false,
                message: 'Failed to reject payment.'
            });
        }
    }
);

// router.put(
//     '/admins/:id',
//     authenticateToken,
//     requireAdmin,
//     adminController.updateAdmin
// );


router.get('/map-data', authenticateToken, adminController.getMapData);//the getMapData is not declare in the adminRoute just yet
module.exports = router;