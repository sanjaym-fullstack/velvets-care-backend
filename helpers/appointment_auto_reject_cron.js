const cron = require('node-cron');
const { Op } = require('sequelize');
const { Appointments } = require('../models');
const { transitionWithFullRefund } = require('./appointment_refund');
const { constants } = require('../config');

// ---------------------------------------------------------------------------
// Cron configuration — sourced from config/constants.js so the schedule and the
// rest of the app can never disagree about the grace period or lookback window.
// ---------------------------------------------------------------------------

const { AUTO_REJECT, REJECTABLE_STATUSES } = constants.APPOINTMENT;

const CRON_EXPRESSION = AUTO_REJECT.CRON;

// Grace period, in MINUTES, after an appointment's scheduled start before the
// sweep treats it as unanswered. This is the "one hour" rule.
const AUTO_REJECT_AFTER_MINUTES = AUTO_REJECT.AFTER_MINUTES;

// How far back the sweep is willing to look, in DAYS. Bounds the job so a
// `pending` row left behind by a long outage is not refunded months later, while
// still covering restarts and brief downtime.
const LOOKBACK_DAYS = AUTO_REJECT.LOOKBACK_DAYS;

// Statuses eligible for automatic rejection.
const ELIGIBLE_STATUSES = AUTO_REJECT.STATUSES;

// `cancel_by` recorded on automatically rejected appointments.
const CANCEL_BY = AUTO_REJECT.CANCEL_BY;

// `cancel_reason` recorded when no human supplied one.
const CANCEL_REASON = AUTO_REJECT.REASON;

// Guards against a slow tick overlapping the next one.
let sweepInProgress = false;

// ---------------------------------------------------------------------------
// Date / time parsing
//
// `appointment_date` and `appointment_time` are free-form STRINGS in the
// appointments table (e.g. "2026-09-27" and "3:00 PM"), so the comparison
// against "now" has to happen in JS rather than in SQL.
// ---------------------------------------------------------------------------

// "3:00 PM" / "3 PM" / "3.00pm" / "15:00" -> minutes since midnight.
const toMinutesOfDay = (timeStr) => {
    if (typeof timeStr !== 'string') return null;

    const match = timeStr.trim().match(/(\d{1,2})[:.\s]*(\d{1,2})?/);
    if (!match) return null;

    let hours = parseInt(match[1], 10);
    const minutes = match[2] !== undefined ? parseInt(match[2], 10) : 0;
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const meridiemMatch = timeStr.match(/([ap])\.?m/i);
    if (meridiemMatch) {
        if (meridiemMatch[1].toLowerCase() === 'p' && hours < 12) hours += 12;
        if (meridiemMatch[1].toLowerCase() === 'a' && hours === 12) hours = 0;
    }

    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
};

// Any of "YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY", optionally with a trailing
// time portion -> a local Date at midnight.
const parseDateOnly = (dateStr) => {
    if (typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    let year;
    let month;
    let day;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

    if (isoMatch) {
        year = parseInt(isoMatch[1], 10);
        month = parseInt(isoMatch[2], 10);
        day = parseInt(isoMatch[3], 10);
    } else if (slashMatch) {
        const first = parseInt(slashMatch[1], 10);
        const second = parseInt(slashMatch[2], 10);
        year = parseInt(slashMatch[3], 10);
        // First part above 12 can only be a day, so assume DD/MM/YYYY.
        if (first > 12) {
            day = first;
            month = second;
        } else {
            month = first;
            day = second;
        }
    } else {
        const fallback = new Date(trimmed);
        if (isNaN(fallback.getTime())) return null;
        year = fallback.getFullYear();
        month = fallback.getMonth() + 1;
        day = fallback.getDate();
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

// Local Date for an appointment's scheduled start, or null if unparseable.
const getAppointmentStart = (appointment) => {
    const date = parseDateOnly(appointment.appointment_date);
    if (!date) return null;

    const minutes = toMinutesOfDay(appointment.appointment_time);
    if (minutes === null) return null;

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        Math.floor(minutes / 60),
        minutes % 60,
        0,
        0
    );
};

// YYYY-MM-DD for a Date, in local time.
const toDateOnlyString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// True once the appointment's start time is at least AUTO_REJECT_AFTER_MINUTES
// in the past.
const hasGracePeriodElapsed = (appointment, now) => {
    const start = getAppointmentStart(appointment);
    if (!start) return false;
    return start.getTime() + AUTO_REJECT_AFTER_MINUTES * 60 * 1000 <= now.getTime();
};

// ---------------------------------------------------------------------------
// Rejection flow
//
// Delegates to the shared transition+refund flow used by the doctor reject
// endpoint and the missed-appointment mark, so the atomic status claim (and
// therefore the double-refund guard) is identical on all three paths.
// ---------------------------------------------------------------------------

const rejectAppointmentAutomatically = async (appointment) => {
    const reason = CANCEL_REASON;

    const { transitioned, refund } = await transitionWithFullRefund(appointment, {
        fromStatuses: REJECTABLE_STATUSES,
        toStatus: 'rejected',
        cancelBy: CANCEL_BY,
        reason,
        buildNotification: ({ id, amount, status, percent }) => (amount > 0 && status === 'processed'
            ? {
                title: 'Appointment Rejected - Refund Initiated',
                body: `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} was rejected because the doctor did not respond in time. A full refund of ₹${amount} (${percent}%) has been initiated.`,
                extras: { appointment_id: appointment.id, refund_amount: amount, refund_id: id, refund_percent: percent },
            }
            : {
                title: 'Appointment Rejected',
                body: `Your appointment on ${appointment.appointment_date} at ${appointment.appointment_time} has been rejected. Reason: ${reason}`,
                extras: { appointment_id: appointment.id },
            }),
    });

    return {
        id: appointment.id,
        rejected: transitioned,
        refund: transitioned ? refund : null,
    };
};

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

/**
 * Rejects every still-`pending` appointment whose start time is at least
 * AUTO_REJECT_AFTER_MINUTES in the past, running the same flow as a doctor
 * pressing reject. One bad record never stops the rest of the sweep.
 *
 * @param {Date} [now] Injectable clock, for testing.
 * @returns {Promise<{scanned: number, rejected: number, skipped: number, failed: number}>}
 */
const runAutoRejectSweep = async (now = new Date()) => {
    const summary = { scanned: 0, rejected: 0, skipped: 0, failed: 0 };

    try {
        // Everything up to and including today. `Op.lt` against tomorrow is used
        // rather than `Op.lte` against today so rows stored as "YYYY-MM-DD
        // HH:mm:ss" (same-day appointments) are still picked up.
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - LOOKBACK_DAYS);

        const candidates = await Appointments.findAll({
            where: {
                status: { [Op.in]: ELIGIBLE_STATUSES },
                appointment_date: {
                    [Op.gte]: toDateOnlyString(earliest),
                    [Op.lt]: toDateOnlyString(tomorrow),
                },
            },
            raw: true,
        });

        summary.scanned = candidates.length;

        for (const appointment of candidates) {
            if (!hasGracePeriodElapsed(appointment, now)) {
                summary.skipped += 1;
                continue;
            }

            try {
                const result = await rejectAppointmentAutomatically(appointment);
                if (result.rejected) {
                    summary.rejected += 1;
                    console.log(
                        `[AutoReject] Appointment ${appointment.id} auto-rejected (${appointment.appointment_date} ${appointment.appointment_time})` +
                        (result.refund && result.refund.amount > 0
                            ? `, refund ${result.refund.status} ₹${result.refund.amount}`
                            : ', no refund due')
                    );
                } else {
                    summary.skipped += 1;
                    console.log(`[AutoReject] Appointment ${appointment.id} was already handled, skipping`);
                }
            } catch (err) {
                summary.failed += 1;
                console.error(`[AutoReject] Failed to reject appointment ${appointment.id}:`, err.message);
            }
        }

        console.log(
            `[AutoReject] Sweep complete — scanned: ${summary.scanned}, rejected: ${summary.rejected}, ` +
            `skipped: ${summary.skipped}, failed: ${summary.failed}`
        );
    } catch (err) {
        console.error('[AutoReject] Sweep error:', err.message);
    }

    return summary;
};

/**
 * Starts the every-minute sweep. Safe to call more than once — the second call
 * returns the already running task.
 *
 * @returns {object|null} The node-cron task, or null if the expression is invalid.
 */
const startAutoRejectCron = () => {
    if (!cron.validate(CRON_EXPRESSION)) {
        console.error(`[AutoReject] Invalid cron expression "${CRON_EXPRESSION}", job not started`);
        return null;
    }

    const task = cron.schedule(CRON_EXPRESSION, async () => {
        if (sweepInProgress) {
            console.log('[AutoReject] Previous sweep still running, skipping this tick');
            return;
        }
        sweepInProgress = true;
        try {
            await runAutoRejectSweep();
        } finally {
            sweepInProgress = false;
        }
    });

    // Catch up on anything that expired while the process was down.
    runAutoRejectSweep();

    console.log(
        `[AutoReject] Cron started ("${CRON_EXPRESSION}") — auto-rejects pending appointments ` +
        `${AUTO_REJECT_AFTER_MINUTES} minutes after their start time`
    );

    return task;
};

module.exports = {
    startAutoRejectCron,
    runAutoRejectSweep,
    // Exported for testing / manual triggering.
    hasGracePeriodElapsed,
    getAppointmentStart,
    toMinutesOfDay,
    parseDateOnly,
    CRON_EXPRESSION,
    AUTO_REJECT_AFTER_MINUTES,
};
