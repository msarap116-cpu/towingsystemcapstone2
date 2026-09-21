// utils/generateReceipt.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateReceipt(payment) {
    const receiptNumber =
        payment.receipt_number ||
        `RCT-${new Date().getFullYear()}-${payment.payment_id
            .toString()
            .padStart(6, '0')}`;

    const receiptsDir = path.join(__dirname, '..', 'storage', 'receipts');

    await fs.promises.mkdir(receiptsDir, {
        recursive: true
    });

    const fileName = `${receiptNumber}.pdf`;
    const filePath = path.join(receiptsDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        const stream = fs.createWriteStream(filePath);

        stream.on('finish', () => {
            resolve({
                receiptNumber,
                fileName,
                filePath
            });
        });

        stream.on('error', reject);

        doc.pipe(stream);

        doc
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('PAYMENT RECEIPT', {
                align: 'center'
            });

        doc.moveDown();

        doc
            .fontSize(11)
            .font('Helvetica')
            .text(`Receipt Number: ${receiptNumber}`)
            .text(`Payment ID: ${payment.payment_id}`)
            .text(`Request ID: ${payment.request_id}`)
            .text(`Payment Date: ${new Date(payment.payment_date).toLocaleString()}`);

        doc.moveDown();

        doc
            .font('Helvetica-Bold')
            .text('Customer Information');

        doc
            .font('Helvetica')
            .text(`Customer: ${payment.customer_name}`)
            .text(`User ID: ${payment.user_id}`);

        doc.moveDown();

        doc
            .font('Helvetica-Bold')
            .text('Payment Information');

        doc
            .font('Helvetica')
            .text(`Payment Method: ${payment.payment_method.toUpperCase()}`)
            .text(`Reference Number: ${payment.reference_number || payment.transaction_id}`)
            .text(`Status: COMPLETED`);

        doc.moveDown();

doc.moveDown();

doc
    .font('Helvetica-Bold')
    .text('Charges');

doc
    .font('Helvetica')
    .text(`Service Fee: PHP ${Number(payment.base_amount || 0).toFixed(2)}`);

if (payment.additional_charges && payment.additional_charges.length > 0) {
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').text('Additional Charges:');
    doc.font('Helvetica');

    payment.additional_charges.forEach(charge => {
        doc.text(`  - ${charge.description}: PHP ${charge.amount.toFixed(2)}`);
    });
}

doc.moveDown();

doc
    .fontSize(15)
    .font('Helvetica-Bold')
    .text(`Amount Paid: PHP ${Number(payment.total_amount || payment.amount || 0).toFixed(2)}`);

doc.moveDown(2);

        doc
            .fontSize(10)
            .font('Helvetica')
            .text('Thank you for your payment.', {
                align: 'center'
            });

        doc.end();
    });
}

module.exports = generateReceipt;
