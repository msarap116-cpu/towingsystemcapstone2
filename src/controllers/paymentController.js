// src/controllers/paymentController.js

const PDFDocument = require('pdfkit');
const Payment = require('../models/paymentModel');

async function downloadReceipt(req, res) {
    try {
       const paymentId = req.params.paymentId;

        console.log('🧾 Generating receipt for payment:', paymentId);
        console.log('👤 Requested by user:', req.user);

        const payment = await Payment.getPaymentById(paymentId);

        if (!payment) {
            return res.status(404).json({
                message: 'Payment not found.'
            });
        }

        // Make sure the customer owns this payment
        const isOwner =
            Number(payment.user_id) === Number(req.user.id);

        // Admins are allowed to view any receipt
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                message: 'Not authorized to view this receipt.'
            });
        }

        // Only COMPLETED payments can have receipts
        if (payment.status !== 'completed') {
            return res.status(400).json({
                message: 'Receipt is only available for completed payments.'
            });
        }

        // Make sure the payment has a receipt number
        if (!payment.receipt_number) {
            return res.status(400).json({
                message: 'Receipt number has not been generated yet.'
            });
        }

        // PDF response headers
        res.setHeader('Content-Type', 'application/pdf');

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="receipt_${payment.receipt_number}.pdf"`
        );

        const doc = new PDFDocument({
            margin: 50
        });

        doc.pipe(res);

        // RECEIPT HEADER

        doc
            .fontSize(22)
            .font('Helvetica-Bold')
            .text('PAYMENT RECEIPT', {
                align: 'center'
            });

        doc.moveDown();

        doc
            .fontSize(11)
            .font('Helvetica')
            .text('GoodWrench', {
                align: 'center'
            });

        doc
            .text('Thank your for choosing us', {
                align: 'center'
            });

        doc.moveDown(2);


        // RECEIPT INFORMATION


        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Receipt Information');

        doc.moveDown(0.5);

        doc
            .font('Helvetica')
            .text(`Receipt No: ${payment.receipt_number}`);

        doc.text(`Request No: #${payment.request_id}`);

        doc.text(
            `Date: ${
                payment.payment_date
                    ? new Date(payment.payment_date).toLocaleString()
                    : '—'
            }`
        );

        doc.moveDown();


        // CUSTOMER INFORMATION


        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Customer Information');

        doc.moveDown(0.5);

        doc
            .font('Helvetica')
            .text(`Customer: ${payment.customer_name || '—'}`);

        doc.moveDown();


        // PAYMENT INFORMATION


        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Payment Information');

        doc.moveDown(0.5);

        doc
            .font('Helvetica')
            .text(
                `Payment Method: ${
                    payment.payment_method
                        ? payment.payment_method.toUpperCase()
                        : '—'
                }`
            );

        doc.text(
            `Reference Number: ${payment.reference_number || '—'}`
        );

        doc.text(
            `Transaction ID: ${payment.transaction_id || '—'}`
        );

        doc.moveDown();


        // AMOUNT


        doc
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(
                `TOTAL PAID: ₱${Number(payment.amount || 0).toFixed(2)}`
            );

        doc.moveDown();

        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Payment Status: COMPLETED');

        doc.moveDown(2);


        // FOOTER


        doc
            .fontSize(10)
            .font('Helvetica')
            .text(
                'Thank you for choosing GoodWrench',
                {
                    align: 'center'
                }
            );

        doc.text(
            'This document serves as your official payment receipt.',
            {
                align: 'center'
            }
        );

        doc.end();

    } catch (error) {

        console.error('❌ Download receipt error:', error);

        // Avoid trying to send JSON after PDF streaming has started
        if (!res.headersSent) {
            return res.status(500).json({
                message: 'Server error generating PDF.'
            });
        }

        res.end();
    }
}

module.exports = {
    downloadReceipt
};