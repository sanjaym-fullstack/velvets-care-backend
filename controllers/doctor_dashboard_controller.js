const {
    Appointments, Doctors, Users, Reviews, Payouts
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');

const TODAY = () => new Date().toISOString().split('T')[0];
const THIS_MONTH = () => new Date().toISOString().slice(0, 7);

const getNewPatientsThisMonth = async (doctor_id) => {
    const allAppointments = await Appointments.findAll({
        where: { doctor_id },
        attributes: ['patient_id', 'appointment_date'],
        raw: true
    });

    const firstVisits = {};
    allAppointments.forEach(a => {
        const pid = a.patient_id;
        if (!firstVisits[pid] || a.appointment_date < firstVisits[pid]) {
            firstVisits[pid] = a.appointment_date;
        }
    });

    const prefix = THIS_MONTH();
    let count = 0;
    Object.values(firstVisits).forEach(date => {
        if (date && date.startsWith(prefix)) count++;
    });
    return count;
};

const getSummaryStats = async (doctor_id) => {
    const baseWhere = { doctor_id };

    const [
        totalAppointments,
        pendingApprovals,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        totalEarnings,
        thisMonthEarnings,
        totalPaidOut,
        totalReviews,
        avgRatingResult,
        doctorRecord
    ] = await Promise.all([
        Appointments.count({ where: baseWhere }),
        Appointments.count({ where: { ...baseWhere, status: 'pending' } }),
        Appointments.count({ where: { ...baseWhere, status: 'completed' } }),
        Appointments.count({ where: { ...baseWhere, status: 'cancelled' } }),
        Appointments.count({ where: { ...baseWhere, status: 'no_show' } }),
        Appointments.sum('consultation_fee', {
            where: { ...baseWhere, status: 'completed', payment_status: 'paid' }
        }) || 0,
        Appointments.sum('consultation_fee', {
            where: {
                doctor_id,
                status: 'completed',
                payment_status: 'paid',
                appointment_date: { [Op.startsWith]: THIS_MONTH() }
            }
        }) || 0,
        Payouts.sum('net_payout', {
            where: { doctor_id, status: 'processed' }
        }) || 0,
        Reviews.count({ where: { doctor_id } }),
        Reviews.findOne({
            where: { doctor_id },
            attributes: [[fn('AVG', col('rating')), 'avg_rating']],
            raw: true
        }),
        Doctors.findOne({
            where: { id: doctor_id },
            attributes: ['total_earnings', 'consultation_fee'],
            raw: true
        })
    ]);

    const todayStr = TODAY();
    const [todayCount, totalPatientsResult, upcomingCount] = await Promise.all([
        Appointments.count({ where: { ...baseWhere, appointment_date: todayStr } }),
        Appointments.findAll({
            where: baseWhere,
            attributes: [[literal('COUNT(DISTINCT patient_id)'), 'count']],
            raw: true
        }),
        Appointments.count({
            where: {
                ...baseWhere,
                status: { [Op.in]: ['pending', 'approved'] },
                appointment_date: { [Op.gte]: todayStr }
            }
        })
    ]);

    const totalPatients = parseInt(totalPatientsResult[0]?.count) || 0;
    const newPatientsThisMonth = await getNewPatientsThisMonth(doctor_id);
    const avgRating = avgRatingResult?.avg_rating
        ? parseFloat(parseFloat(avgRatingResult.avg_rating).toFixed(1))
        : 0;
    const completionRate = totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 1000) / 10
        : 0;
    const doctorEarnings = doctorRecord?.total_earnings || 0;
    const pendingPayout = Math.max(0, doctorEarnings - totalPaidOut);

    return {
        total_appointments: totalAppointments,
        today_appointments: todayCount,
        upcoming_appointments: upcomingCount,
        pending_approvals: pendingApprovals,
        completed_appointments: completedAppointments,
        cancelled_appointments: cancelledAppointments,
        no_show_appointments: noShowAppointments,
        completion_rate: completionRate,
        total_earnings: totalEarnings,
        this_month_earnings: thisMonthEarnings,
        consultation_fee: doctorRecord?.consultation_fee || 0,
        total_paid_out: totalPaidOut,
        pending_payout: pendingPayout,
        avg_rating: avgRating,
        total_reviews: totalReviews,
        total_patients: totalPatients,
        new_patients_this_month: newPatientsThisMonth
    };
};

const getMonthlyTrends = async (doctor_id, year) => {
    const rows = await Appointments.findAll({
        attributes: [
            [fn('MONTH', col('appointment_date')), 'month'],
            [fn('COUNT', literal('*')), 'bookings'],
            [fn('SUM', literal("CASE WHEN status = 'completed' THEN 1 ELSE 0 END")), 'completed'],
            [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancelled'],
            [fn('SUM', literal("CASE WHEN status = 'no_show' THEN 1 ELSE 0 END")), 'no_show'],
            [fn('SUM', literal("CASE WHEN status = 'completed' AND payment_status = 'paid' THEN consultation_fee ELSE 0 END")), 'revenue'],
            [literal('COUNT(DISTINCT patient_id)'), 'patients']
        ],
        where: {
            doctor_id,
            appointment_date: {
                [Op.between]: [`${year}-01-01`, `${year}-12-31`]
            }
        },
        group: [fn('MONTH', col('appointment_date'))],
        order: [[fn('MONTH', col('appointment_date')), 'ASC']],
        raw: true
    });

    const monthlyMap = {};
    rows.forEach(r => { monthlyMap[r.month] = r; });

    return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const found = monthlyMap[m];
        return {
            month: m,
            bookings: found ? parseInt(found.bookings) : 0,
            completed: found ? parseInt(found.completed) : 0,
            cancelled: found ? parseInt(found.cancelled) : 0,
            no_show: found ? parseInt(found.no_show) : 0,
            revenue: found ? parseFloat(found.revenue) || 0 : 0,
            new_patients: found ? parseInt(found.patients) : 0
        };
    });
};

const getStatusDistribution = async (doctor_id) => {
    const rows = await Appointments.findAll({
        attributes: [
            'status',
            [fn('COUNT', literal('*')), 'count']
        ],
        where: { doctor_id },
        group: ['status'],
        raw: true
    });
    return rows.map(r => ({
        status: r.status || 'unknown',
        count: parseInt(r.count)
    }));
};

const getWeekdayDistribution = async (doctor_id) => {
    const rows = await Appointments.findAll({
        attributes: [
            [literal('MAX(DAYNAME(appointment_date))'), 'day'],
            [fn('COUNT', literal('*')), 'count']
        ],
        where: { doctor_id },
        group: [fn('DAYOFWEEK', col('appointment_date'))],
        order: [[fn('DAYOFWEEK', col('appointment_date')), 'ASC']],
        raw: true
    });
    return rows.map(r => ({
        day: r.day,
        count: parseInt(r.count)
    }));
};

const getConsultationModes = async (doctor_id) => {
    const rows = await Appointments.findAll({
        attributes: [
            'consultation_modes',
            [fn('COUNT', literal('*')), 'count']
        ],
        where: {
            doctor_id,
            consultation_modes: { [Op.not]: null, [Op.ne]: '' }
        },
        group: ['consultation_modes'],
        order: [[literal('count'), 'DESC']],
        raw: true
    });
    return rows.map(r => ({
        mode: r.consultation_modes,
        count: parseInt(r.count)
    }));
};

const getRatingData = async (doctor_id) => {
    const rows = await Reviews.findAll({
        attributes: [
            'rating',
            [fn('COUNT', literal('*')), 'count']
        ],
        where: { doctor_id },
        group: ['rating'],
        order: [['rating', 'DESC']],
        raw: true
    });
    return rows.map(r => ({
        rating: parseInt(r.rating),
        count: parseInt(r.count)
    }));
};

const getPatientGrowth = async (doctor_id, year) => {
    const allAppointments = await Appointments.findAll({
        where: { doctor_id },
        attributes: ['patient_id', 'appointment_date'],
        raw: true
    });

    const firstVisits = {};
    allAppointments.forEach(a => {
        const pid = a.patient_id;
        if (!firstVisits[pid] || a.appointment_date < firstVisits[pid]) {
            firstVisits[pid] = a.appointment_date;
        }
    });

    const monthCounts = {};
    Object.values(firstVisits).forEach(date => {
        if (date && date.startsWith(`${year}-`)) {
            const month = parseInt(date.split('-')[1], 10);
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
    });

    let cumulative = 0;
    return Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const newP = monthCounts[m] || 0;
        cumulative += newP;
        return { month: m, new_patients: newP, cumulative };
    });
};

const getPayoutHistory = async (doctor_id, year) => {
    const rows = await Payouts.findAll({
        attributes: [
            [fn('DATE_FORMAT', col('processed_at'), literal("'%Y-%m'")), 'month'],
            [fn('SUM', col('total_earnings')), 'total_earnings'],
            [fn('SUM', col('total_deductions')), 'deductions'],
            [fn('SUM', col('net_payout')), 'net']
        ],
        where: {
            doctor_id,
            status: 'processed',
            processed_at: {
                [Op.between]: [`${year}-01-01`, `${year}-12-31`]
            }
        },
        group: [fn('DATE_FORMAT', col('processed_at'), literal("'%Y-%m'"))],
        order: [[literal('month'), 'ASC']],
        raw: true
    });
    return rows.map(r => ({
        month: r.month,
        total_earnings: parseFloat(r.total_earnings) || 0,
        deductions: parseFloat(r.deductions) || 0,
        net: parseFloat(r.net) || 0
    }));
};

const getTopPatients = async (doctor_id) => {
    const rows = await Appointments.findAll({
        attributes: [
            'patient_id',
            [fn('COUNT', literal('*')), 'visits'],
            [fn('SUM', col('consultation_fee')), 'total_spent']
        ],
        where: { doctor_id },
        group: ['patient_id'],
        order: [[literal('visits'), 'DESC']],
        limit: 10,
        raw: true
    });

    if (!rows.length) return [];

    const patientIds = rows.map(r => r.patient_id);
    const users = await Users.findAll({
        where: { id: { [Op.in]: patientIds } },
        attributes: ['id', 'name', 'phone'],
        raw: true
    });
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    return rows.map(r => ({
        patient_id: r.patient_id,
        name: userMap[r.patient_id]?.name || 'Unknown',
        phone: userMap[r.patient_id]?.phone || null,
        visits: parseInt(r.visits),
        total_spent: parseFloat(r.total_spent) || 0
    }));
};

const getDoctorDashboard = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctor_id = session_user.doctor_id;
        if (!doctor_id) throw new Error('Doctor not found');

        const { year } = req.query;
        const targetYear = year || new Date().getFullYear();

        const [
            summary,
            monthlyTrends,
            statusDistribution,
            weekdayDistribution,
            consultationModes,
            ratingDistribution,
            patientGrowth,
            payoutHistory,
            topPatients
        ] = await Promise.all([
            getSummaryStats(doctor_id),
            getMonthlyTrends(doctor_id, targetYear),
            getStatusDistribution(doctor_id),
            getWeekdayDistribution(doctor_id),
            getConsultationModes(doctor_id),
            getRatingData(doctor_id),
            getPatientGrowth(doctor_id, targetYear),
            getPayoutHistory(doctor_id, targetYear),
            getTopPatients(doctor_id)
        ]);

        return h.response({
            success: true,
            message: 'Doctor dashboard data fetched',
            data: {
                summary,
                graphs: {
                    monthly_trends: monthlyTrends,
                    status_distribution: statusDistribution,
                    weekday_distribution: weekdayDistribution,
                    consultation_modes: consultationModes,
                    rating_distribution: ratingDistribution,
                    patient_growth: patientGrowth,
                    payout_history: payoutHistory,
                    top_patients: topPatients
                }
            }
        }).code(200);

    } catch (err) {
        console.error('Doctor dashboard error:', err);
        return h.response({
            success: false,
            message: err.message
        }).code(200);
    }
};

module.exports = { getDoctorDashboard };
