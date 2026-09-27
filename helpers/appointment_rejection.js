const { Appointments } = require('../models');
const { Op } = require('sequelize');
const { normalizeFee } = require('./index');
const { refundPayment } = require('./razorpay');
const { NotificationHelper } = require('./notification_helper');
const { GoogleCalendarHelper } = require('./google_calendar');
const { constants } = require('../config');

const { REJECTABLE_STATUSES, AUTO_REJECT } = constants.APPOINTMENT;

/**
 * The single rejection flow shared by the doctor reject endpoint
 * (POST /appointment/{id}/reject) and the scheduler's auto-reject sweep, so both
 * entry points stay in lockstep.
 *
 * Performs a 100% refund, flips the appointment to `rejected`, clears its Google
 * Calendar event and notifies the patient.
 *
 * @param {import('sequelize').Model} appointment  Loaded appointment instance.
 * @param {string} [cancel_reason]  Falls back to AUTO_REJECT.REASON.
 * @returns {Promise<{appointment: object, refund: {id: string|null, amount: number, status: string|null}}>}
 * @throws  If the appointment is no longer in a rejectable status.
 */
const rejectAppointmentByDoctor = async (appointment, cancel_reason) => {
    if (!appointment || !appointment.id) {
        throw new Error('Appointment not found');
    }

    const reason = cancel_reason || AUTO_REJECT.REASON;

    // Claim the appointment atomically before touching Razorpay. Both entry
    // points can race (double-clicked reject, or a second scheduler tick on
    // another instance), and a conditional UPDATE lets exactly one of them win,
    // which is what keeps the refund from being issued twice.
    const [claimed] = await Appointments.update(
        {
            status: 'rejected',
            cancel_reason: reason,
            cancel_by: AUTO_REJECT.CANCEL_BY,
        },
        {
            where: {
                id: appointment.id,
                status: { [Op.in]: REJECTABLE_STATUSES },
            },
        }
    );

    if (!claimed) {
        throw new Error(
            `Only ${REJECTABLE_STATUSES.join('/')} appointments can be rejected. Current status: ${appointment.status}`
        );
    }

    // Doctor rejection always gets a full refund.
    let refundAmount = 0;
    let refundStatus = null;
    let refundId = null;

    if (appointment.payment_status === 'paid' && appointment.payment_id) {
        refundAmount = normalizeFee(appointment.consultation_fee);

        if (refundAmount > 0) {
            try {
                const refund = await refundPayment(appointment.payment_id, refundAmount, {
                    reason,
                    appointment_id: appointment.id,
                });
                refundId = refund.id;
                refundStatus = refund.status || 'processed';
                // Razorpay reports the amount actually refunded, in rupees.
                refundAmount = refund.refund_amount_rupees || refundAmount;
            } catch (refundErr) {
                console.error('Refund failed:', refundErr.message);
                refundStatus = 'failed';
            }
        }
    }

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

    if (refundAmount > 0 && refundStatus === 'processed') {
        NotificationHelper.sendToUser(
            appointment.patient_id,
            'Appointment Rejected - Refund Initiated',
            `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} was rejected by the doctor. Full refund of ₹${refundAmount} has been initiated.`,
            { appointment_id: appointment.id, refund_amount: refundAmount, refund_id: refundId }
        );
    } else {
        NotificationHelper.sendToUser(
            appointment.patient_id,
            'Appointment Rejected',
            `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been rejected. Reason: ${reason || 'N/A'}`,
            { appointment_id: appointment.id }
        );
    }

    return {
        appointment,
        refund: { id: refundId, amount: refundAmount, status: refundStatus },
    };
};

module.exports = { rejectAppointmentByDoctor };
