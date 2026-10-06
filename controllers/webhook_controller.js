'use strict';

const { Appointments, Payments, Orders } = require('../models');
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

// The webhook is how a refund raised by hand from the Razorpay dashboard comes
// back into our tables. Payments are matched to either an appointment
// (appointments.payment_id) or an order (payments.payment_reference_id), so a
// manual refund on either product updates the right row.
const resolveTarget = async (paymentId) => {
    const appointment = await Appointments.findOne({ where: { payment_id: paymentId } });
    if (appointment) {
        return { kind: 'appointment', record: appointment };
    }

    const payment = await Payments.findOne({ where: { payment_reference_id: paymentId } });
    if (payment) {
        const order = await Orders.findByPk(payment.order_id);
        if (order) return { kind: 'order', record: order };
    }

    return null;
};

// Persist the state move. Returns false when the delivery was a duplicate or an
// out-of-order event that must not regress a settled refund.
const applyRefundState = (record, nextStatus, refundId, refundedRupees) => {
    const isSameRefund = record.refund_id === refundId;
    const currentRank = REFUND_STATUS_RANK[record.refund_status];
    const nextRank = REFUND_STATUS_RANK[nextStatus];

    // Same refund, same state — a Razorpay redelivery. Nothing to do, so no
    // second write and no second notification.
    if (isSameRefund && record.refund_status === nextStatus) {
        return { applied: false, reason: 'duplicate' };
    }

    // A late `refund.created` must not undo a refund that already settled.
    if (isSameRefund && currentRank !== undefined && nextRank < currentRank) {
        return { applied: false, reason: 'out_of_order' };
    }

    const updateData = {
        refund_id: refundId,
        refund_amount: refundedRupees,
        refund_status: nextStatus,
    };

    if (nextStatus === 'processed') {
        updateData.refund_date = record.refund_date || new Date();
        if (!record.refund_reason) {
            updateData.refund_reason = 'Refund processed via Razorpay';
        }
    }

    if (nextStatus === 'failed') {
        updateData.refund_date = null;
        updateData.refund_reason = 'Refund failed on Razorpay';
    }

    return { applied: true, updateData };
};

// Percentage is measured against what was actually paid, so a partial refund
// raised by hand reports honestly instead of claiming 100%.
const refundPercent = (paidRupees, refundedRupees) => {
    if (!paidRupees) return 100;
    return Math.min(100, Math.round((refundedRupees / paidRupees) * 100));
};

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

        const target = await resolveTarget(paymentId);
        if (!target) {
            console.log(`No appointment or order found for payment_id: ${paymentId}`);
            return h.response({ status: 'ok' }).code(200);
        }

        const { kind, record } = target;
        const nextStatus = eventType === 'refund.failed' ? 'failed'
            : (gatewayStatus === 'processed' ? 'processed' : 'pending');

        const decision = applyRefundState(record, nextStatus, refundId, refundedRupees);
        if (!decision.applied) {
            console.log(
                `Refund ${refundId} ignored for ${kind} ${record.id} (${decision.reason}), ` +
                `current status: ${record.refund_status}`
            );
            return h.response({ status: 'ok' }).code(200);
        }

        await record.update(decision.updateData);
        console.log(`${kind} #${record.id} updated with refund status: ${nextStatus}`);

        // Only announce a refund that has actually settled. A failed refund goes
        // to admins only, so the customer is not told about money that never moved.
        if (nextStatus === 'processed') {
            const paidRupees = kind === 'order'
                ? Number(record.total_amount) || refundedRupees
                : Number(record.consultation_fee) || refundedRupees;
            const percent = refundPercent(paidRupees, refundedRupees);
            const recipient = kind === 'order' ? record.user_id : record.patient_id;
            const what = kind === 'order' ? 'order' : 'appointment';

            NotificationHelper.sendToUser(
                recipient,
                'Refund Processed',
                percent >= 100
                    ? `Your full refund of ₹${refundedRupees} for ${what} #${record.id} has been processed. It will be credited in 5-7 business days.`
                    : `Your refund of ₹${refundedRupees} (${percent}% of ₹${paidRupees}) for ${what} #${record.id} has been processed. It will be credited in 5-7 business days.`,
                {
                    [`${what}_id`]: record.id,
                    refund_id: refundId,
                    refund_amount: refundedRupees,
                    refund_percent: percent,
                }
            );

            NotificationHelper.sendToAllAdmins(
                'Refund Processed',
                `Refund of ₹${refundedRupees} (${percent}%) for ${what} #${record.id} (Payment: ${paymentId}) has been processed.`,
                { [`${what}_id`]: record.id, payment_id: paymentId, refund_id: refundId, refund_percent: percent }
            );
        } else if (nextStatus === 'failed') {
            NotificationHelper.sendToAllAdmins(
                'Refund Failed',
                `Refund of ₹${refundedRupees} for ${kind} #${record.id} (Payment: ${paymentId}) has failed. Please retry from the Razorpay dashboard.`,
                { [`${kind}_id`]: record.id, payment_id: paymentId, refund_id: refundId }
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
