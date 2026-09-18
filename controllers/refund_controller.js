'use strict';

const { Appointments, Users, Doctors } = require('../models');
const { Op, fn, col } = require('sequelize');
const Sequelize = require('sequelize');
const { NotificationHelper } = require('../helpers');

// Admin: Get all refunds with filters
const getAllRefunds = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);

        const { page = 1, limit = 20, doctor_id, user_id, refund_status, from_date, to_date } = req.query;
        const offset = (page - 1) * limit;

        const where = {
            refund_id: { [Op.ne]: null },
        };
        if (doctor_id) where.doctor_id = doctor_id;
        if (user_id) where.patient_id = user_id;
        if (refund_status) where.refund_status = refund_status;
        if (from_date && to_date) {
            const endDate = new Date(to_date);
            endDate.setHours(23, 59, 59, 999);
            where.refund_date = { [Op.between]: [from_date, endDate] };
        }

        const { rows, count } = await Appointments.findAndCountAll({
            where,
            include: [
                { model: Users, attributes: ['id', 'name', 'phone', 'email'] },
                { model: Doctors, attributes: ['id', 'full_name', 'phone', 'email', 'specialization'] },
            ],
            limit: Number(limit),
            offset,
            order: [['refund_date', 'DESC']],
        });

        // Summary stats
        const stats = await Appointments.findAll({
            where: { refund_id: { [Op.ne]: null } },
            attributes: [
                [fn('COUNT', col('id')), 'total_refunds'],
                [fn('SUM', col('refund_amount')), 'total_refund_amount'],
                [fn('AVG', col('refund_amount')), 'avg_refund_amount'],
            ],
            raw: true,
        });

        const statusStats = await Appointments.findAll({
            where: { refund_id: { [Op.ne]: null } },
            attributes: [
                'refund_status',
                [fn('COUNT', col('id')), 'count'],
                [fn('SUM', col('refund_amount')), 'amount'],
            ],
            group: ['refund_status'],
            raw: true,
        });

        return res.response({
            success: true,
            message: 'Refunds fetched successfully',
            data: {
                refunds: rows,
                summary: {
                    total_refunds: Number(stats[0]?.total_refunds) || 0,
                    total_refund_amount: Number(stats[0]?.total_refund_amount) || 0,
                    avg_refund_amount: Number(stats[0]?.avg_refund_amount) || 0,
                    by_status: statusStats,
                },
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(count / limit),
                }
            }
        }).code(200);
    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
    }
};

// Doctor: Get own refunds
const getDoctorRefunds = async (req, res) => {
    try {
        const user = req.headers.user;
        const doctor_id = user.doctor_id;

        const { page = 1, limit = 20, refund_status } = req.query;
        const offset = (page - 1) * limit;

        const where = {
            doctor_id,
            refund_id: { [Op.ne]: null },
        };
        if (refund_status) where.refund_status = refund_status;

        const { rows, count } = await Appointments.findAndCountAll({
            where,
            include: [
                { model: Users, attributes: ['id', 'name', 'phone'] },
            ],
            limit: Number(limit),
            offset,
            order: [['refund_date', 'DESC']],
        });

        // Doctor's total refund impact on earnings
        const refundTotal = await Appointments.findAll({
            where: {
                doctor_id,
                refund_id: { [Op.ne]: null },
            },
            attributes: [
                [fn('SUM', col('refund_amount')), 'total_refunded'],
                [fn('COUNT', col('id')), 'total_refund_count'],
            ],
            raw: true,
        });

        return res.response({
            success: true,
            message: 'Your refunds fetched successfully',
            data: {
                refunds: rows,
                summary: {
                    total_refunded: Number(refundTotal[0]?.total_refunded) || 0,
                    total_refund_count: Number(refundTotal[0]?.total_refund_count) || 0,
                },
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(count / limit),
                }
            }
        }).code(200);
    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
    }
};

// User: Get own refunds
const getUserRefunds = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const user_id = session_user.user_id;

        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { rows, count } = await Appointments.findAndCountAll({
            where: {
                patient_id: user_id,
                refund_id: { [Op.ne]: null },
            },
            include: [
                { model: Doctors, attributes: ['id', 'full_name', 'specialization'] },
            ],
            limit: Number(limit),
            offset,
            order: [['refund_date', 'DESC']],
        });

        return res.response({
            success: true,
            message: 'Your refunds fetched successfully',
            data: {
                refunds: rows,
                pagination: {
                    total: count,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(count / limit),
                }
            }
        }).code(200);
    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
    }
};

module.exports = {
    getAllRefunds,
    getDoctorRefunds,
    getUserRefunds
};
