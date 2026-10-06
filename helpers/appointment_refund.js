const { Appointments } = require('../models');
const { Op } = require('sequelize');
const { refundFullPayment } = require('./razorpay');
const { NotificationHelper } = require('./notification_helper');
const { GoogleCalendarHelper } = require('./google_calendar');
const { constants } = require('../config');

const { REFUND } = constants;

/**
 * The single refund flow shared by every appointment refund trigger — patient
 * cancel, doctor reject, the auto-reject sweep and the missed-appointment
 * (no_show) mark — so all four behave identically and none of them can drift.
 *
 * Every trigger is a FULL refund: the entire captured payment is returned, so
 * the customer always gets back 100% of what they paid.
 *
 * Two guards keep the refund from being issued twice:
 *  1. An atomic conditional UPDATE claims the appointment before Razorpay is
 *     touched. Concurrent callers (double-tapped reject, a scheduler tick
 *     racing a doctor) all read the same row, but only one UPDATE matches, so
 *     only one of them proceeds to refund.
 *  2. An already-settled refund is never re-sent, which also covers a retry
 *     after a crash midway through the original attempt.
 *
 * @param {import('sequelize').Model} appointment  Loaded appointment instance.
 * @param {object} options
 * @param {string[]} options.fromStatuses  Statuses the appointment may move from.
 * @param {string} options.toStatus        Status to move it to.
 * @param {string} options.cancelBy        'patient' or 'doctor'.
 * @param {string} options.reason          Recorded as cancel_reason/refund_reason.
 * @param {(refund: {id: string|null, amount: number, status: string|null, percent: number}) => {title: string, body: string, extras: object}} options.buildNotification
 *        Copy for the patient. Receives the refund outcome — take the id from
 *        here, never from the caller's own binding.
 * @returns {Promise<{transitioned: boolean, refund: {id: string|null, amount: number, status: string|null, percent: number}}>}
 */
const transitionWithFullRefund = async (appointment, options) => {
    const {
        fromStatuses,
        toStatus,
        cancelBy,
        reason,
        buildNotification,
    } = options;

    if (!appointment || !appointment.id) {
        throw new Error('Appointment not found');
    }

    // Claim the appointment atomically before touching Razorpay. This is the
    // step that makes a double refund impossible.
    const [claimed] = await Appointments.update(
        {
            status: toStatus,
            cancel_reason: reason,
            cancel_by: cancelBy,
        },
        {
            where: {
                id: appointment.id,
                status: { [Op.in]: fromStatuses },
            },
        }
    );

    if (!claimed) {
        // Someone else already moved it out of an eligible status.
        return {
            transitioned: false,
            refund: { id: appointment.refund_id, amount: appointment.refund_amount || 0, status: appointment.refund_status, percent: 0 },
        };
    }

    const refundable = appointment.payment_status === 'paid' && !!appointment.payment_id;
    const alreadySettled = appointment.refund_status === 'processed';

    let refundId = null;
    let refundAmount = 0;
    let refundStatus = null;

    if (refundable && !alreadySettled) {
        try {
            const refund = await refundFullPayment(appointment.payment_id, {
                reason,
                appointment_id: appointment.id,
                trigger: toStatus,
            });
            refundId = refund.id;
            refundStatus = refund.status || 'processed';
            refundAmount = refund.refund_amount_rupees || 0;
        } catch (refundErr) {
            // Never let a gateway error abort the status change — the
            // appointment is already transitioned and the failure is recorded
            // so it shows up in the admin refund list for a manual retry.
            console.error(`Refund failed for appointment ${appointment.id}:`, refundErr.message);
            refundStatus = 'failed';
        }
    } else if (alreadySettled) {
        refundId = appointment.refund_id;
        refundAmount = appointment.refund_amount || 0;
        refundStatus = appointment.refund_status;
    }

    // Every settled refund is a full one, so the percentage is 100 whenever
    // money actually went back.
    const percent = refundStatus === 'processed' && refundAmount > 0 ? 100 : 0;

    // A retry attempt can resolve to "already fully refunded" and hand back no
    // gateway id — never clobber an id we already know about with null.
    const keptRefundId = refundId || appointment.refund_id || null;

    await Appointments.update(
        {
            refund_id: keptRefundId,
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_date: refundAmount > 0 ? (appointment.refund_date || new Date()) : null,
            refund_reason: reason,
        },
        { where: { id: appointment.id } }
    );

    // Keep the caller's instance in step with what was persisted.
    if (typeof appointment.reload === 'function') {
        await appointment.reload();
    }

    GoogleCalendarHelper.deleteCalendarEvents(appointment.id).catch((e) =>
        console.error('Google Calendar event deletion failed (non-blocking):', e.message)
    );

    // `id` is handed to the callback rather than read from the caller's
    // binding: the caller is still awaiting this function, so any reference to
    // its own `refund` const inside the callback would hit the temporal dead
    // zone and throw on exactly the success path.
    const copy = buildNotification({ id: keptRefundId, amount: refundAmount, status: refundStatus, percent });
    if (copy) {
        NotificationHelper.sendToUser(appointment.patient_id, copy.title, copy.body, copy.extras);
    }

    return {
        transitioned: true,
        refund: { id: keptRefundId, amount: refundAmount, status: refundStatus, percent },
    };
};

/**
 * The shape every refund endpoint returns, so cancel, reject, no-show, order
 * cancel and retry all answer with the same object.
 */
const refundSummary = (refund) => ({
    refund_id: refund?.id ?? null,
    refund_amount: refund?.amount ?? 0,
    refund_status: refund?.status ?? null,
    refund_percent: refund?.percent ?? 0,
});

/**
 * Re-attempts the money movement for an appointment whose refund did not
 * settle on the first try (gateway error, timeout, or a crash between the
 * refund and the write). Safe to call repeatedly:
 *
 *  - refuses an appointment that is not in a refunded-state,
 *  - refuses one that is already recorded as processed,
 *  - `refundFullPayment` only ever sends the remaining balance, so a retry
 *    after a crash that moved the money but never recorded it reports the
 *    original amount rather than refunding twice.
 *
 * @param {import('sequelize').Model} appointment
 * @returns {Promise<{retried: boolean, reason: string|null, refund: object}>}
 */
const retryAppointmentRefund = async (appointment) => {
    if (!appointment || !appointment.id) {
        throw new Error('Appointment not found');
    }

    if (appointment.payment_status !== 'paid' || !appointment.payment_id) {
        return { retried: false, reason: 'Appointment was not paid', refund: refundSummary(null) };
    }

    if (appointment.refund_status === 'processed') {
        return {
            retried: false,
            reason: 'Refund is already processed',
            refund: refundSummary({
                id: appointment.refund_id,
                amount: appointment.refund_amount,
                status: appointment.refund_status,
                percent: appointment.refund_amount > 0 ? 100 : 0,
            }),
        };
    }

    if (!REFUND.REFUNDABLE_STATUSES.includes(appointment.status)) {
        return {
            retried: false,
            reason: `Appointment is ${appointment.status}, not in a refunded state`,
            refund: refundSummary(null),
        };
    }

    let refundId = appointment.refund_id;
    let refundAmount = 0;
    let refundStatus = null;

    try {
        const result = await refundFullPayment(appointment.payment_id, {
            reason: appointment.refund_reason || REFUND.REASONS.CANCEL,
            appointment_id: appointment.id,
            trigger: 'retry',
        });
        refundId = result.id || appointment.refund_id || null;
        refundStatus = result.status || 'processed';
        refundAmount = result.refund_amount_rupees || 0;
    } catch (refundErr) {
        console.error(`Refund retry failed for appointment ${appointment.id}:`, refundErr.message);
        refundStatus = 'failed';
    }

    const percent = refundStatus === 'processed' && refundAmount > 0 ? 100 : 0;

    await Appointments.update(
        {
            refund_id: refundId,
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_date: refundAmount > 0 ? (appointment.refund_date || new Date()) : null,
        },
        { where: { id: appointment.id } }
    );

    if (typeof appointment.reload === 'function') {
        await appointment.reload();
    }

    if (refundStatus === 'processed') {
        NotificationHelper.sendToUser(
            appointment.patient_id,
            'Refund Processed',
            `Your full refund of ₹${refundAmount} (${percent}%) for appointment #${appointment.id} has been processed. It will be credited in 5-7 business days.`,
            { appointment_id: appointment.id, refund_id: refundId, refund_amount: refundAmount, refund_percent: percent }
        );
        NotificationHelper.sendToAllAdmins(
            'Refund Processed',
            `Refund of ₹${refundAmount} (${percent}%) for appointment #${appointment.id} has been processed.`,
            { appointment_id: appointment.id, refund_id: refundId, refund_percent: percent }
        );
    }

    return {
        retried: refundStatus === 'processed',
        reason: refundStatus === 'processed' ? null : 'Razorpay refund failed, check the gateway logs',
        refund: refundSummary({ id: refundId, amount: refundAmount, status: refundStatus, percent }),
    };
};

module.exports = { transitionWithFullRefund, retryAppointmentRefund, refundSummary, REFUND };
