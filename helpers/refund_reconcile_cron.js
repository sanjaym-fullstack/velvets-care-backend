'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Appointments, Orders } = require('../models');
const { fetchRefund } = require('./razorpay');
const { sendToUser, sendToAllAdmins } = require('./notification_helper');

// Every 5 minutes. A refund normally settles in seconds, but this job exists
// precisely for the case where the webhook never arrives (secret missing, URL
// wrong, Razorpay outage), so it is deliberately frequent and cheap: it only
// touches rows still sitting in `pending`.
const CRON_EXPRESSION = '*/5 * * * *';

// `processed` is the only terminal state; `pending` and `failed` are both
// re-read from Razorpay until they settle.
const toOurStatus = (gatewayStatus) => {
    if (gatewayStatus === 'processed') return 'processed';
    if (gatewayStatus === 'failed') return 'failed';
    return 'pending';
};

// The webhook is the primary path and owns notifications when it is working.
// Notifying from here as well would tell the customer the same thing twice,
// so this job only speaks up when the webhook cannot possibly have spoken.
const webhookIsEnabled = () => Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);

const buildUpdate = (record, gatewayStatus, refundedRupees) => {
    const updateData = { refund_status: gatewayStatus, refund_amount: refundedRupees };

    if (gatewayStatus === 'processed') {
        updateData.refund_date = record.refund_date || new Date();
        if (!record.refund_reason) updateData.refund_reason = 'Refund processed via Razorpay';
    }

    if (gatewayStatus === 'failed') {
        updateData.refund_date = null;
        updateData.refund_reason = 'Refund failed on Razorpay';
    }

    return updateData;
};

const reconcileOne = async (kind, record) => {
    if (!record.refund_id || record.refund_status !== 'pending') return false;

    let gateway;
    try {
        gateway = await fetchRefund(record.refund_id);
    } catch (err) {
        console.error(`[RefundReconcile] ${kind} #${record.id}: fetch ${record.refund_id} failed — ${err.message}`);
        return false;
    }

    const nextStatus = toOurStatus(gateway?.status);
    if (nextStatus === 'pending') return false; // still moving, nothing to write

    const paidRupees = kind === 'order'
        ? Number(record.total_amount) || 0
        : Number(record.consultation_fee) || 0;
    const refundedRupees = Math.round((Number(gateway.amount) || 0) / 100) || paidRupees;

    await record.update(buildUpdate(record, nextStatus, refundedRupees));
    console.log(`[RefundReconcile] ${kind} #${record.id} -> ${nextStatus} (refund ${record.refund_id})`);

    if (webhookIsEnabled()) return true;

    const percent = paidRupees > 0
        ? Math.min(100, Math.round((refundedRupees / paidRupees) * 100))
        : 100;
    const recipient = kind === 'order' ? record.user_id : record.patient_id;
    const what = kind === 'order' ? 'order' : 'appointment';

    if (nextStatus === 'processed') {
        sendToUser(
            recipient,
            'Refund Processed',
            `Your full refund of ₹${refundedRupees} for ${what} #${record.id} has been processed. It will be credited in 5-7 business days.`,
            { [`${what}_id`]: record.id, refund_id: record.refund_id, refund_amount: refundedRupees, refund_percent: percent }
        );
        sendToAllAdmins(
            'Refund Processed',
            `Refund of ₹${refundedRupees} (${percent}%) for ${what} #${record.id} has been processed.`,
            { [`${what}_id`]: record.id, refund_id: record.refund_id, refund_percent: percent }
        );
    } else if (nextStatus === 'failed') {
        sendToAllAdmins(
            'Refund Failed',
            `Refund of ₹${refundedRupees} for ${kind} #${record.id} has failed. Please retry from the Razorpay dashboard.`,
            { [`${kind}_id`]: record.id, refund_id: record.refund_id }
        );
    }

    return true;
};

/**
 * Pulls every still-`pending` refund from Razorpay and writes whatever state
 * Razorpay actually holds. One bad record never stops the rest.
 *
 * @returns {Promise<{scanned: number, updated: number, failed: number}>}
 */
const runRefundReconcile = async () => {
    const summary = { scanned: 0, updated: 0, failed: 0 };

    try {
        const [appointments, orders] = await Promise.all([
            Appointments.findAll({
                where: { refund_status: 'pending', refund_id: { [Op.ne]: null } },
                raw: true,
            }),
            Orders.findAll({
                where: { refund_status: 'pending', refund_id: { [Op.ne]: null } },
                raw: true,
            }),
        ]);

        const pending = [
            ...appointments.map(record => ({ kind: 'appointment', record })),
            ...orders.map(record => ({ kind: 'order', record })),
        ];
        summary.scanned = pending.length;

        for (const { kind, record } of pending) {
            try {
                // `raw: true` rows have no `update()`; reload a live instance.
                const live = kind === 'order'
                    ? await Orders.findByPk(record.id)
                    : await Appointments.findByPk(record.id);
                if (!live) continue;

                if (await reconcileOne(kind, live)) summary.updated += 1;
            } catch (err) {
                summary.failed += 1;
                console.error(`[RefundReconcile] ${kind} #${record.id}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error('[RefundReconcile] Sweep error:', err.message);
    }

    return summary;
};

let sweepInProgress = false;

/**
 * Starts the reconciler and does one pass immediately, so a refund stuck from
 * before the restart settles on the next boot rather than on the next tick.
 *
 * @returns {object|null} The node-cron task, or null if the expression is invalid.
 */
const startRefundReconcileCron = () => {
    if (!cron.validate(CRON_EXPRESSION)) {
        console.error(`[RefundReconcile] Invalid cron expression "${CRON_EXPRESSION}", job not started`);
        return null;
    }

    const task = cron.schedule(CRON_EXPRESSION, async () => {
        if (sweepInProgress) return;
        sweepInProgress = true;
        try {
            await runRefundReconcile();
        } finally {
            sweepInProgress = false;
        }
    });

    runRefundReconcile();

    console.log(
        `[RefundReconcile] Cron started ("${CRON_EXPRESSION}") — settles pending refunds every 5 minutes` +
        (webhookIsEnabled() ? '' : ' (webhook secret missing, this job is the only path)')
    );

    return task;
};

module.exports = {
    startRefundReconcileCron,
    runRefundReconcile,
    CRON_EXPRESSION,
};
