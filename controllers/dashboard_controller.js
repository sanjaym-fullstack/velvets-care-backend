// dashboard.controller.js
const { Users, Doctors, Appointments, Payments } = require('../models');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');


const getDashboardStats = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");

        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) throw new Error("start_date and end_date are required");

        const start = new Date(start_date);
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);

        // 1. Users Registered Count
        const userCount = await Users.count({
            where: { createdAt: { [Op.between]: [start, end] } }
        });

        // 2. Bookings Count
        const bookingCount = await Appointments.count({
            where: { createdAt: { [Op.between]: [start, end] } }
        });

        // 3. Total Booking Amount
        const bookingAmount = await Appointments.sum('consultation_fee', {
            where: { createdAt: { [Op.between]: [start, end] } }
        }) || 0;

        // 4. Total Commission Amount (20% assumed)
        const commissionAmount = bookingAmount * 0.2;

        // 5. Total Doctors Count
        const doctorCount = await Doctors.count({
            where: { createdAt: { [Op.between]: [start, end] } }
        });

        // 6. Total Payout Amount
        const payoutAmount = await Payments.sum('amount', {
            where: { createdAt: { [Op.between]: [start, end] } }
        }) || 0;

        return res.response({
            success: true,
            message: "Dashboard stats fetched",
            data: {
                userCount,
                bookingCount,
                bookingAmount,
                commissionAmount,
                doctorCount,
                payoutAmount
            }
        }).code(200);

    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};
const getYearlyDashboardStats = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");

        const { year } = req.query;
        if (!year) throw new Error("year is required");

        const results = await Appointments.findAll({
            attributes: [
                [Sequelize.fn("MONTH", Sequelize.col("createdAt")), "month"],
                [Sequelize.fn("COUNT", Sequelize.col("id")), "booking_count"],
                [Sequelize.fn("COUNT", Sequelize.col("patient_id")), "patient_count"],
                [Sequelize.fn("SUM", Sequelize.col("cunsultation_fee")), "total_amount"],
                [Sequelize.literal("SUM(cunsultation_fee * 0.20)"), "commission_amount"],
                // [Sequelize.fn("SUM", Sequelize.col("payout_amount")), "payout_amount"],
            ],
            where: Sequelize.where(
                Sequelize.fn("YEAR", Sequelize.col("createdAt")),
                year
            ),
            group: ["month"],
            raw: true
        });

        // Create 12-month structure
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
            const found = results.find(r => r.month == i + 1);
            return {
                month: i + 1,
                booking_count: found ? parseInt(found.booking_count) : 0,
                patient_count: found ? parseInt(found.patient_count) : 0,
                total_amount: found ? parseFloat(found.total_amount) : 0,
                commission_amount: found ? parseFloat(found.commission_amount) : 0,
                // payout_amount: found ? parseFloat(found.payout_amount) : 0
            };
        });

        return res.response({
            success: true,
            message: "Yearly dashboard data fetched",
            data: monthlyData
        });

    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};
module.exports = { getDashboardStats, getYearlyDashboardStats };
