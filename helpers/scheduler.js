const { Appointments, Users, Doctors } = require('../models');
const { Op } = require('sequelize');
const { NotificationHelper } = require('./notification_helper');

const normalizeDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const to24Hour = (timeStr) => {
    const hasAMPM = /[AP]M/i.test(timeStr);
    const num = parseInt(timeStr.replace(/[:\s]/g, '').replace(/[APap][Mm]/g, ''));
    if (!hasAMPM) return num;
    const isPM = /PM/i.test(timeStr);
    let val = num;
    if (isPM && val < 1200) val += 1200;
    if (!isPM && val === 1200) val = 0;
    return val;
};

const send24HourReminders = async () => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = normalizeDate(tomorrow.toISOString());

        const appointments = await Appointments.findAll({
            where: {
                appointment_date: tomorrowStr,
                status: { [Op.in]: ['pending', 'approved'] },
            },
            raw: true,
        });

        for (const appt of appointments) {
            try {
                NotificationHelper.sendToUser(appt.patient_id,
                    'Appointment Tomorrow',
                    `You have an appointment tomorrow at ${appt.appointment_time}. Please be prepared.`,
                    { appointment_id: appt.id, date: appt.appointment_date, time: appt.appointment_time }
                );
                NotificationHelper.sendToDoctor(appt.doctor_id,
                    'Appointment Tomorrow',
                    `You have an appointment tomorrow at ${appt.appointment_time}.`,
                    { appointment_id: appt.id, date: appt.appointment_date, time: appt.appointment_time }
                );
            } catch (e) {
                console.error('24hr reminder failed for appointment', appt.id, e.message);
            }
        }
        console.log(`[Reminder] Sent 24hr reminders for ${appointments.length} appointments`);
    } catch (err) {
        console.error('[Reminder] 24hr reminder error:', err.message);
    }
};

const send1HourReminders = async () => {
    try {
        const todayStr = normalizeDate(new Date().toISOString());
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime24 = currentHour * 100 + currentMinute;

        const appointments = await Appointments.findAll({
            where: {
                appointment_date: todayStr,
                status: { [Op.in]: ['pending', 'approved'] },
            },
            raw: true,
        });

        for (const appt of appointments) {
            try {
                const apptTime24 = to24Hour(appt.appointment_time);
                const diffMinutes = apptTime24 - currentTime24;
                // Send reminder if appointment is within 30-90 minutes
                if (diffMinutes >= 30 && diffMinutes <= 90) {
                    NotificationHelper.sendToUser(appt.patient_id,
                        'Appointment in 1 Hour',
                        `Your appointment is in about 1 hour at ${appt.appointment_time}. Please be ready.`,
                        { appointment_id: appt.id, time: appt.appointment_time }
                    );
                    NotificationHelper.sendToDoctor(appt.doctor_id,
                        'Appointment in 1 Hour',
                        `You have an appointment in about 1 hour at ${appt.appointment_time}.`,
                        { appointment_id: appt.id, time: appt.appointment_time }
                    );
                }
            } catch (e) {
                console.error('1hr reminder failed for appointment', appt.id, e.message);
            }
        }
        console.log(`[Reminder] Checked 1hr reminders for ${appointments.length} appointments`);
    } catch (err) {
        console.error('[Reminder] 1hr reminder error:', err.message);
    }
};

const sendMonthlyEarningsSummary = async () => {
    try {
        const { Doctors: DoctorsModel, Payouts } = require('../models');
        const { fn, col } = require('sequelize');

        const doctors = await DoctorsModel.findAll({ where: { status: true, verified: true }, raw: true });

        for (const doctor of doctors) {
            try {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                const { Appointments: ApptModel } = require('../models');
                const monthEarnings = await ApptModel.findAll({
                    where: {
                        doctor_id: doctor.id,
                        status: 'completed',
                        payment_status: 'paid',
                    },
                    attributes: [
                        [fn('SUM', col('consultation_fee')), 'total'],
                    ],
                    raw: true,
                });

                const total = Number(monthEarnings[0]?.total) || 0;
                if (total > 0) {
                    NotificationHelper.sendToDoctor(doctor.id,
                        'Monthly Earnings Summary',
                        `Your earnings for ${now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })} are ₹${total}. Keep up the great work!`,
                        { month: now.getMonth() + 1, year: now.getFullYear(), total_earnings: total }
                    );
                }
            } catch (e) {
                console.error('Monthly summary failed for doctor', doctor.id, e.message);
            }
        }
        console.log(`[Reminder] Sent monthly earnings summary to ${doctors.length} doctors`);
    } catch (err) {
        console.error('[Reminder] Monthly summary error:', err.message);
    }
};

const startSchedulers = () => {
    // Check every 30 minutes for 24hr reminders
    setInterval(send24HourReminders, 30 * 60 * 1000);
    // Check every 10 minutes for 1hr reminders
    setInterval(send1HourReminders, 10 * 60 * 1000);
    // Monthly earnings summary — run once on server start, then daily check
    setInterval(sendMonthlyEarningsSummary, 24 * 60 * 60 * 1000);

    // Run once on start
    send24HourReminders();
    send1HourReminders();

    console.log('[Scheduler] Appointment reminders and monthly summaries started');
};

module.exports = { startSchedulers, send24HourReminders, send1HourReminders, sendMonthlyEarningsSummary };
