'use strict';

const { Appointments } = require('../models');
const { NotificationHelper } = require('../helpers');
const { verifyWebhookSignature } = require('../helpers/razorpay');

// Razorpay delivers the raw body with an X-Razorpay-Signature header, so the
// route disables payload parsing. That means the signature must be checked
// against the *raw* bytes before the body is trusted, and the body is only
// parsed once the signature is known to be genuine.
//
// Razorpay delivers `refund.created` before `refund.processed`, but the two are
// separate deliveries and can arrive out of order. Ranking the states means a
// late `created` can never walk a settled refund back to pending.
const REFUND_STATUS_RANK = { failed: 0, pending: 1, processed: 2 };

// Returns true when the event was handled and changed something, false when the
// delivery was a duplicate or carried no state change worth notifying about.
const handleRazorpayWebhook = async (req, h) => {
    // Razorpay retries on any non-2xx, and a duplicate delivery must never
    // double-notify, so every outcome below returns 200.
    try {
        const rawBody = Buffer.isBuffer(req.payload)
            ? req.payload.toString('utf8')
            : (typeof req.payload === 'string' ? req.payload : JSON.stringify(req.payload));

        const signature = req.headers['x-razorpay-signature'];

        try {
            verifyWebhookSignature(rawBody, signature);
        } catch (sigErr) {
            console.error('Razorpay webhook signature verification failed:', sigErr.message);
            return h.response({ status: 'ok' }).code(200);
        }

        let event;
        try {
            event = JSON.parse(rawBody);
        } catch (parseErr) {
            console.error('Razorpay webhook body is not valid JSON:', parseErr.message);
            return h.response({ status: 'ok' }).code(200);
        }

        const eventType = event?.event;

        if (!['refund.created', 'refund.processed', 'refund.failed'].includes(eventType)) {
            // Payments and other events are not handled here yet.
            return h.response({ status: 'ok' }).code(200);
        }

        const refund = event.payload?.refund?.entity;
        if (!refund) {
            console.log('No refund entity in webhook payload');
            return h.response({ status: 'ok' }).code(200);
        }

        const paymentId = refund.payment_id;
        const refundId = refund.id;
        // Razorpay reports paise; the rest of the app stores rupees.
        const refundedRupees = Math.round((Number(refund.amount) || 0) / 100);
        const gatewayStatus = refund.status; // processed | pending | failed

        console.log(
            `Refund webhook: event=${eventType} payment_id=${paymentId} ` +
            `refund_id=${refundId} amount=${refundedRupees} status=${gatewayStatus}`
        );

        if (!paymentId || !refundId) {
            console.log('Refund webhook missing payment_id or refund_id, ignoring');
            return h.response({ status: 'ok' }).code(200);
        }

        const appointment = await Appointments.findOne({ where: { payment_id: paymentId } });
        if (!appointment) {
            console.log(`No appointment found for payment_id: ${paymentId}`);
            return h.response({ status: 'ok' }).code(200);
        }

        // The appointment is already reflected in the DB for refunds we raised
        // ourselves. The webhook exists to catch refunds issued by hand from the
        // Razorpay dashboard, and to move a pending refund on to processed.
        // Either way, only act when this refund is not the one already recorded
        // or the status has genuinely moved — that is what makes redelivery of
        // the same webhook a no-op.
        const isSameRefund = appointment.refund_id === refundId;
        const nextStatus = eventType === 'refund.failed' ? 'failed'
            : (gatewayStatus === 'processed' ? 'processed' : 'pending');

        const currentRank = REFUND_STATUS_RANK[appointment.refund_status];
        const nextRank = REFUND_STATUS_RANK[nextStatus];

        if (isSameRefund && appointment.refund_status === nextStatus) {
            console.log(`Refund ${refundId} already recorded as ${nextStatus} for appointment ${appointment.id}, skipping`);
            return h.response({ status: 'ok' }).code(200);
        }

        // A late `refund.created` must not undo a refund that already settled.
        if (isSameRefund && currentRank !== undefined && nextRank < currentRank) {
            console.log(
                `Ignoring out-of-order ${nextStatus} for refund ${refundId} — ` +
                `appointment ${appointment.id} is already ${appointment.refund_status}`
            );
            return h.response({ status: 'ok' }).code(200);
        }

        const updateData = {
            refund_id: refundId,
            refund_amount: refundedRupees,
            refund_status: nextStatus,
        };

        if (nextStatus === 'processed') {
            updateData.refund_date = appointment.refund_date || new Date();
            if (!appointment.refund_reason) {
                updateData.refund_reason = 'Refund processed via Razorpay';
            }
        }

        if (nextStatus === 'failed') {
            updateData.refund_date = null;
            updateData.refund_reason = 'Refund failed on Razorpay';
        }

        await appointment.update(updateData);
        console.log(`Appointment #${appointment.id} updated with refund status: ${nextStatus}`);

        // Only announce a refund that has actually settled. A failed refund goes
        // to admins only, so the patient is not told about money that never moved.
        if (nextStatus === 'processed') {
            // Percentage is measured against what was actually paid, so a partial
            // refund raised by hand reports honestly instead of claiming 100%.
            const paidRupees = (Number(appointment.consultation_fee) || 0) || refundedRupees;
            const percent = paidRupees > 0
                ? Math.min(100, Math.round((refundedRupees / paidRupees) * 100))
                : 100;

            NotificationHelper.sendToUser(
                appointment.patient_id,
                'Refund Processed',
                percent >= 100
                    ? `Your full refund of ₹${refundedRupees} for appointment #${appointment.id} has been processed. It will be credited in 5-7 business days.`
                    : `Your refund of ₹${refundedRupees} (${percent}% of ₹${paidRupees}) for appointment #${appointment.id} has been processed. It will be credited in 5-7 business days.`,
                {
                    appointment_id: appointment.id,
                    refund_id: refundId,
                    refund_amount: refundedRupees,
                    refund_percent: percent,
                }
            );

            NotificationHelper.sendToAllAdmins(
                'Refund Processed',
                `Refund of ₹${refundedRupees} (${percent}%) for appointment #${appointment.id} (Payment: ${paymentId}) has been processed.`,
                { appointment_id: appointment.id, payment_id: paymentId, refund_id: refundId, refund_percent: percent }
            );
        } else if (nextStatus === 'failed') {
            NotificationHelper.sendToAllAdmins(
                'Refund Failed',
                `Refund of ₹${refundedRupees} for appointment #${appointment.id} (Payment: ${paymentId}) has failed. Please retry from the Razorpay dashboard.`,
                { appointment_id: appointment.id, payment_id: paymentId, refund_id: refundId }
            );
        }

        return h.response({ status: 'ok' }).code(200);
    } catch (error) {
        console.error('Webhook error:', error);
        // Always return 200 to Razorpay — otherwise it will retry
        return h.response({ status: 'ok' }).code(200);
    }
};

module.exports = { handleRazorpayWebhook };
