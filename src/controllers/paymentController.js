// src/controllers/paymentController.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Payment = require('../models/paymentModel');

const FONT_REGULAR = path.join(__dirname, '..', 'public', 'fonts', 'NotoSans-Italic-VariableFont_wdth,wght.ttf');
const FONT_BOLD = path.join(__dirname, '..', 'public', 'fonts', 'NotoSans-Bold.ttf');

async function downloadReceipt(req, res) {
    try {
        const paymentId = req.params.paymentId;

        console.log('🧾 Generating receipt for payment:', paymentId);
        console.log('👤 Requested by user:', req.user);

        const payment = await Payment.getReceiptDetails(paymentId);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        const isOwner = Number(payment.user_id) === Number(req.user.id);
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view this receipt.' });
        }

        if (payment.status !== 'completed') {
            return res.status(400).json({
                message: 'Receipt is only available for completed payments.'
            });
        }

        if (!payment.receipt_number) {
            return res.status(400).json({
                message: 'Receipt number has not been generated yet.'
            });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="receipt_${payment.receipt_number}.pdf"`
        );

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Register custom fonts
        doc.registerFont('Body', FONT_REGULAR);
        doc.registerFont('Body-Bold', FONT_BOLD);

        // Make Body the default
        doc.font('Body');
        doc.pipe(res);


        // LAYOUT CONSTANTS

        const pageWidth = doc.page.width;
        const margin = 50;
        const contentWidth = pageWidth - margin * 2;
        const labelWidth = 170;
        const valueWidth = contentWidth - labelWidth;

        // Helper: draw a row (label | value) inside a table
        function drawRow(label, value, options = {}) {
            const {
                labelBold = false,
                valueBold = false,
                shade = false,
                rowHeight = 22,
                fontSize = 11
            } = options;

            const startY = doc.y;
            const startX = margin;

            // Optional row shading
            if (shade) {
                doc.save()
                    .rect(startX, startY, contentWidth, rowHeight)
                    .fill('#F5F5F5')
                    .restore();
            }

            // Row bottom border
            doc.save()
                .moveTo(startX, startY + rowHeight)
                .lineTo(startX + contentWidth, startY + rowHeight)
                .strokeColor('#DDDDDD')
                .lineWidth(0.5)
                .stroke()
                .restore();

            // Label cell
            doc.font(labelBold ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(fontSize)
                .fillColor('#000000')
                .text(label, startX + 8, startY + 6, {
                    width: labelWidth - 16,
                    align: 'left'
                });

            // Value cell
            doc.font(valueBold ? 'Helvetica-Bold' : 'Helvetica')
                .fontSize(fontSize)
                .fillColor('#000000')
                .text(String(value ?? '—'), startX + labelWidth + 8, startY + 6, {
                    width: valueWidth - 16,
                    align: 'left'
                });

            // Advance cursor
            doc.y = startY + rowHeight;
        }

        // Helper: draw a full-width single-cell row (section title)
        function drawSectionHeader(title) {
            const startY = doc.y;
            const startX = margin;

            doc.save()
                .rect(startX, startY, contentWidth, 24)
                .fill('#1F2937')
                .restore();

            doc.font('Helvetica-Bold')
                .fontSize(11)
                .fillColor('#FFFFFF')
                .text(title, startX + 8, startY + 7, {
                    width: contentWidth - 16
                });

            doc.fillColor('#000000');
            doc.y = startY + 24;
        }


        // HEADER + LOGO

        const logoPath = path.join(__dirname, '..', 'public', 'image', 'ic_launcher_round.png');

        if (fs.existsSync(logoPath)) {
            // Logo on the left, sized to 60x60
            doc.image(logoPath, margin, 45, { width: 60, height: 60 });

            // Title next to logo
            doc.font('Helvetica-Bold')
                .fontSize(22)
                .fillColor('#111827')
                .text('PAYMENT RECEIPT', margin + 75, 55, {
                    width: contentWidth - 75
                });

            doc.font('Helvetica')
                .fontSize(11)
                .fillColor('#6B7280')
                .text('GoodWrench — Thank you for choosing us', margin + 75, 85);
        } else {
            // Fallback: centered text if no logo
            doc.font('Helvetica-Bold')
                .fontSize(22)
                .fillColor('#111827')
                .text('PAYMENT RECEIPT', { align: 'center' });

            doc.moveDown(0.3);

            doc.font('Helvetica')
                .fontSize(11)
                .fillColor('#6B7280')
                .text('GoodWrench — Thank you for choosing us', { align: 'center' });
        }

        doc.fillColor('#000000');
        doc.moveDown(3);


        // RECEIPT INFORMATION TABLE

        drawSectionHeader('Receipt Information');
        drawRow('Receipt No:', payment.receipt_number, { valueBold: true });
        drawRow('Request No:', `#${payment.request_id}`, { shade: true });
        drawRow(
            'Date:',
            payment.payment_date
                ? new Date(payment.payment_date).toLocaleString()
                : '—'
        );

        doc.moveDown(1);


        // CUSTOMER INFORMATION TABLE

        drawSectionHeader('Customer Information');
        drawRow('Customer:', payment.customer_name || '—');

        doc.moveDown(1);


        // PAYMENT INFORMATION TABLE

        drawSectionHeader('Payment Information');
        drawRow(
            'Payment Method:',
            payment.payment_method
                ? payment.payment_method.toUpperCase()
                : '—'
        );
        drawRow('Reference Number:', payment.reference_number || '—', { shade: true });
        drawRow('Transaction ID:', payment.transaction_id || '—');

        doc.moveDown(1);


        // CHARGES TABLE

        drawSectionHeader('Charges');
        drawRow(
            'Service Fee:',
            `₱${Number(payment.base_amount || 0).toFixed(2)}`
        );

        if (payment.additional_charges && payment.additional_charges.length > 0) {
            payment.additional_charges.forEach((charge, idx) => {
                drawRow(
                    `  • ${charge.description}`,
                    `₱${Number(charge.amount).toFixed(2)}`,
                    { shade: idx % 2 === 0 }
                );
            });
        }

        doc.moveDown(1);


        // TOTAL (highlighted)

        const totalY = doc.y;
        doc.save()
            .rect(margin, totalY, contentWidth, 32)
            .fill('#1F2937')
            .restore();

        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('#FFFFFF')
            .text('TOTAL PAID', margin + 10, totalY + 8, {
                width: contentWidth / 2
            });

        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('#FFFFFF')
            .text(
                `₱${Number(payment.total_amount || payment.payment_amount || 0).toFixed(2)}`,
                margin,
                totalY + 8,
                { width: contentWidth - 10, align: 'right' }
            );

        doc.fillColor('#000000');
        doc.y = totalY + 42;


        // STATUS

        doc.font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#16A34A')
            .text('Payment Status: COMPLETED', { align: 'center' });

        doc.fillColor('#000000');
        doc.moveDown(2);


        // FOOTER

        doc.fontSize(10)
            .font('Helvetica')
            .fillColor('#6B7280')
            .text('Thank you for choosing GoodWrench', { align: 'center' });

        doc.text('This document serves as your official payment receipt.', {
            align: 'center'
        });

        doc.end();
    } catch (error) {
        console.error('Download receipt error:', error);

        if (!res.headersSent) {
            return res.status(500).json({ message: 'Server error generating PDF.' });
        }
        res.end();
    }
}

module.exports = {
    downloadReceipt
};