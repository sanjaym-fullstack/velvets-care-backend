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
 * @param {(refund: {amount: number, status: string|null}) => {title: string, body: string, extras: object}} options.buildNotification
 *        Copy for the patient. Receives the refund outcome.
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

    await Appointments.update(
        {
            refund_id: refundId,
            refund_amount: refundAmount,
            refund_status: refundStatus,
            refund_date: refundAmount > 0 ? new Date() : null,
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

    const copy = buildNotification({ amount: refundAmount, status: refundStatus, percent });
    if (copy) {
        NotificationHelper.sendToUser(appointment.patient_id, copy.title, copy.body, copy.extras);
    }

    return {
        transitioned: true,
        refund: { id: refundId, amount: refundAmount, status: refundStatus, percent },
    };
};

module.exports = { transitionWithFullRefund, REFUND };
