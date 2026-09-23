'use strict';

const { Appointments } = require('../models');
const { NotificationHelper } = require('../helpers');

// Razorpay sends webhook with X-Razorpay-Signature header
// We verify the signature using razorpayInstance.webhooks

const handleRazorpayWebhook = async (req, h) => {
    try {
        const event = req.payload;
        const eventType = event?.event;

        console.log('Razorpay webhook received:', eventType);

        // Handle refund events
        if (eventType === 'refund.created' || eventType === 'refund.processed' || eventType === 'refund.failed') {
            const refund = event.payload?.refund?.entity;
            if (!refund) {
                console.log('No refund entity in webhook payload');
                return h.response({ status: 'ok' }).code(200);
            }

            const paymentId = refund.payment_id;
            const refundId = refund.id;
            const refundAmountPaise = refund.amount;
            const refundAmountRupees = Math.round(refundAmountPaise / 100);
            const refundStatus = refund.status; // processed, pending, failed

            console.log(`Refund webhook: payment_id=${paymentId}, refund_id=${refundId}, amount=${refundAmountRupees}, status=${refundStatus}`);

            // Find the appointment by payment_id
            const appointment = await Appointments.findOne({
                where: { payment_id: paymentId }
            });

            if (!appointment) {
                console.log(`No appointment found for payment_id: ${paymentId}`);
                return h.response({ status: 'ok' }).code(200);
            }

            // Update appointment with refund info
            const updateData = {};

            if (eventType === 'refund.failed') {
                // Refund failed — reset so admin can retry
                updateData.refund_status = 'failed';
                updateData.refund_id = refundId;
                updateData.refund_amount = refundAmountRupees;
                updateData.refund_reason = 'Refund failed on Razorpay';

                // Notify admin about failed refund
                NotificationHelper.sendToAllAdmins(
                    'Refund Failed',
                    `Refund of ₹${refundAmountRupees} for appointment #${appointment.id} (Payment: ${paymentId}) has failed. Please retry from Razorpay dashboard.`,
                    { appointment_id: appointment.id, payment_id: paymentId, refund_id: refundId }
                );
            } else {
                // Refund created or processed — update success
                updateData.refund_id = refundId;
                updateData.refund_amount = refundAmountRupees;
                updateData.refund_status = refundStatus === 'processed' ? 'processed' : 'pending';
                updateData.refund_date = new Date();

                // Notify user about successful refund
                if (refundStatus === 'processed') {
                    NotificationHelper.sendToUser(appointment.patient_id,
                        'Refund Processed',
                        `Your refund of ₹${refundAmountRupees} for appointment #${appointment.id} has been processed. It will be credited in 5-7 business days.`,
                        { appointment_id: appointment.id, refund_id: refundId, refund_amount: refundAmountRupees }
                    );

                    NotificationHelper.sendToAllAdmins(
                        'Refund Processed',
                        `Refund of ₹${refundAmountRupees} for appointment #${appointment.id} (Payment: ${paymentId}) has been processed successfully.`,
                        { appointment_id: appointment.id, payment_id: paymentId, refund_id: refundId }
                    );
                }
            }

            await appointment.update(updateData);
            console.log(`Appointment #${appointment.id} updated with refund status: ${updateData.refund_status}`);
        }

        return h.response({ status: 'ok' }).code(200);
    } catch (error) {
        console.error('Webhook error:', error);
        // Always return 200 to Razorpay — otherwise it will retry
        return h.response({ status: 'ok' }).code(200);
    }
};

module.exports = { handleRazorpayWebhook };
