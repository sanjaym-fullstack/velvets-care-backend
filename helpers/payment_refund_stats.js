'use strict';

const { constants } = require('../config');

const REFUNDABLE_STATUSES = (constants.REFUND && constants.REFUND.REFUNDABLE_STATUSES) || [];

// Human readable label for each top level stage, so the UI can render a
// single "Paid -> Refunded" chip without re-deriving anything.
const STAGE_LABELS = {
    not_paid: 'Payment pending',
    paid: 'Paid',
    refund_due: 'Refund due',
    refund_pending: 'Refund initiated',
    refund_failed: 'Refund failed',
    refunded: 'Refunded',
};

/**
 * Build a "Paid -> Refunded" progress block for one appointment.
 *
 * Money states are derived from three fields only:
 *   payment_status  - 'paid' when Razorpay captured the consultation fee
 *   refund_status   - null | 'pending' | 'processed' | 'failed'
 *   refund_amount   - rupees actually handed back
 *
 * The result is additive and purely presentational: it never changes the
 * appointment, so it is safe to attach to every list response.
 *
 * @param {object} appointment sequelize instance or plain row
 * @returns {{
 *   stage: string, stage_label: string, stage_progress: number,
 *   paid_amount: number, refunded_amount: number, refund_percent: number,
 *   refund_status: string|null, refund_id: string|null,
 *   refund_date: any, refund_reason: string|null, can_retry: boolean,
 *   timeline: Array<{key:string,label:string,status:string,amount:number,at:any,detail:string}>
 * }}
 */
const buildPaymentRefundStats = (appointment) => {
    const a = (appointment && appointment.dataValues) || appointment || {};

    const fee = Number(a.consultation_fee || 0);
    const paid = String(a.payment_status || '').toLowerCase() === 'paid';
    const refundStatus = a.refund_status ? String(a.refund_status).toLowerCase() : null;
    const refundAmount = Number(a.refund_amount || 0);
    const refundId = a.refund_id || null;
    const refundDate = a.refund_date || null;
    const refundReason = a.refund_reason || a.cancel_reason || null;
    const appointmentStatus = String(a.status || '').toLowerCase();
    const refundable = REFUNDABLE_STATUSES.includes(appointmentStatus);

    // A refund is "in play" once the money left us and the appointment is one
    // the policy refunds, or a refund record already exists.
    const refundInPlay = Boolean(refundStatus) || (paid && refundable);

    let stage;
    if (!paid) stage = 'not_paid';
    else if (refundStatus === 'processed' && refundAmount > 0) stage = 'refunded';
    else if (refundStatus === 'failed') stage = 'refund_failed';
    else if (refundStatus === 'pending' || refundStatus === 'initiated') stage = 'refund_pending';
    else if (refundable) stage = 'refund_due';
    else stage = 'paid';

    const refundPercent = refundAmount > 0 && fee > 0
        ? Math.min(100, Math.round((refundAmount / fee) * 100))
        : (stage === 'refunded' ? 100 : 0);

    const timeline = [
        {
            key: 'payment',
            label: paid ? 'Payment received' : 'Payment pending',
            status: paid ? 'done' : 'pending',
            amount: fee,
            at: a.createdAt || null,
            detail: paid
                ? `Paid via Razorpay${a.payment_id ? ` (${a.payment_id})` : ''}`
                : 'Awaiting payment',
        },
    ];

    if (refundInPlay) {
        timeline.push({
            key: 'refund_requested',
            label: 'Refund requested',
            status: refundable || refundStatus ? 'done' : 'pending',
            amount: 0,
            at: a.updatedAt || null,
            detail: refundReason
                ? `Reason: ${refundReason}`
                : 'Appointment became refundable',
        });

        timeline.push({
            key: 'refund_initiated',
            label: 'Refund initiated',
            status: refundStatus === 'processed' || refundStatus === 'pending' || refundStatus === 'initiated'
                ? 'done'
                : (refundStatus === 'failed' ? 'failed' : 'pending'),
            amount: refundAmount || fee,
            at: refundDate,
            detail: refundId
                ? `Razorpay refund ${refundId}`
                : (refundStatus === 'failed'
                    ? 'Refund attempt failed - retry required'
                    : 'Handed over to Razorpay'),
        });

        timeline.push({
            key: 'refund_credited',
            label: 'Refund credited to customer',
            status: refundStatus === 'processed'
                ? 'done'
                : (refundStatus === 'failed' ? 'pending' : 'active'),
            amount: refundAmount || fee,
            at: refundDate,
            detail: refundStatus === 'processed'
                ? `${refundPercent}% of amount credited back`
                : 'Usually settles in 5-7 business days',
        });
    }

    // Mark the first unfinished step as "active" so the UI can highlight it.
    const active = timeline.find(step => step.status !== 'done');
    if (active && active.status !== 'failed') active.status = 'active';

    const done = timeline.filter(step => step.status === 'done').length;

    return {
        stage,
        stage_label: STAGE_LABELS[stage] || stage,
        stage_progress: Math.round((done / timeline.length) * 100),
        paid_amount: paid ? fee : 0,
        refunded_amount: refundAmount,
        refund_percent: refundPercent,
        refund_status: refundStatus,
        refund_id: refundId,
        refund_date: refundDate,
        refund_reason: refundReason,
        can_retry: paid && refundable && (refundStatus === null || refundStatus === 'failed'),
        timeline,
    };
};

/**
 * Attach `payment_refund` to every row of a list response.
 * Accepts sequelize instances or already-plain objects.
 */
const attachRefundStats = (rows = []) =>
    rows.map(row => {
        const plain = (row && typeof row.toJSON === 'function') ? row.toJSON() : { ...row };
        return { ...plain, payment_refund: buildPaymentRefundStats(plain) };
    });

module.exports = { buildPaymentRefundStats, attachRefundStats, STAGE_LABELS };
