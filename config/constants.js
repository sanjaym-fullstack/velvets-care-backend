// Centralised, non-secret tunables. Anything a business rule needs to be able
// to change without touching job/controller logic belongs here.
module.exports = {
    APPOINTMENT: {
        // Statuses that may still be rejected. Mirrors the guard in the
        // doctor reject endpoint so both entry points behave identically.
        REJECTABLE_STATUSES: ['pending'],

        AUTO_REJECT: {
            // Cron expression for the auto-reject sweep. Every minute.
            CRON: '* * * * *',

            // Grace period, in minutes, after an appointment's scheduled start
            // time before the sweep treats it as unanswered. This is the
            // "one hour" rule — change it here to retune the whole job.
            AFTER_MINUTES: 60,

            // How far back the sweep scans, in days. Bounds the job so stale
            // `pending` records are not refunded months after a long outage,
            // while still covering brief downtime and server restarts.
            LOOKBACK_DAYS: 1,

            // Statuses eligible for automatic rejection.
            STATUSES: ['pending'],

            // cancel_by recorded on automatically rejected appointments.
            CANCEL_BY: 'doctor',

            // cancel_reason recorded when no human supplied one.
            REASON: 'Doctor did not respond within the allotted time',
        },
    },
}
