'use strict';
const { Op, fn, col, literal } = require('sequelize');
const { Appointments, Payments, Orders, Payouts, Users, Doctors } = require('../models');

const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parseInt(parts[0]) > 12) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        if (parseInt(parts[0]) > 12) {
            const [day, month, year] = parts;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        const [month, day, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
};

const buildDateFilter = (field, date_from, date_to) => {
    const conditions = [];
    if (date_from) {
        const from = parseDate(date_from);
        conditions.push({ [Op.gte]: from });
    }
    if (date_to) {
        const to = parseDate(date_to);
        conditions.push({ [Op.lte]: to + ' 23:59:59' });
    }
    if (conditions.length === 0) return null;
    return conditions.length === 1 ? { [field]: conditions[0] } : { [field]: { [Op.and]: conditions } };
};

const buildAppointmentDateFilter = (date_from, date_to) => {
    const conditions = [];
    if (date_from) {
        const from = parseDate(date_from);
        conditions.push({ [Op.gte]: from });
    }
    if (date_to) {
        const to = parseDate(date_to);
        conditions.push({ [Op.lte]: to });
    }
    if (conditions.length === 0) return null;
    return conditions.length === 1 ? { appointment_date: conditions[0] } : { appointment_date: { [Op.and]: conditions } };
};

const paginate = (page = 1, limit = 20) => {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
    return { offset: (p - 1) * l, limit: l, page: p, perPage: l };
};

// ─────────────────────────────────────────────────────
// ADMIN - All Transactions (Appointments + Orders + Payouts)
// ─────────────────────────────────────────────────────
const getAdminTransactions = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') throw new Error('Unauthorized');

        const {
            page, limit, date_from, date_to,
            type, payment_status, search,
            sort_by = 'date', sort_order = 'DESC'
        } = req.query;

        const pager = paginate(page, limit);
        const results = [];
        let summary = { total_amount: 0, total_refunds: 0, net_revenue: 0, count: 0 };

        // ── Appointment Transactions ──
        if (!type || type === 'appointment' || type === 'refund') {
            const where = {};
            const dateFilter = buildAppointmentDateFilter(date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.payment_status = payment_status;
            if (type === 'refund') where.refund_status = { [Op.not]: null };

            if (search) {
                const doctorIds = (await Doctors.findAll({
                    where: { full_name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(d => d.id);
                const userIds = (await Users.findAll({
                    where: { name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(u => u.id);

                where[Op.or] = [
                    { payment_id: { [Op.like]: `%${search}%` } },
                    { refund_id: { [Op.like]: `%${search}%` } },
                    { doctor_id: { [Op.in]: doctorIds } },
                    { patient_id: { [Op.in]: userIds } }
                ];
            }

            const appointments = await Appointments.findAll({
                where,
                include: [
                    { model: Users, as: 'user', attributes: ['id', 'name', 'email', 'phone'], required: false },
                    { model: Doctors, attributes: ['id', 'full_name', 'email', 'phone'], required: false }
                ],
                order: [[sort_by === 'amount' ? 'consultation_fee' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            const allAppointments = type === 'refund' ? await Appointments.findAll({
                where: { ...where }, attributes: ['consultation_fee', 'refund_amount', 'payment_status', 'refund_status'], raw: true
            }) : [];

            for (const a of appointments) {
                results.push({
                    id: a.id,
                    type: a.refund_status ? 'refund' : 'appointment',
                    date: a.appointment_date,
                    time: a.appointment_time,
                    amount: a.consultation_fee || 0,
                    refund_amount: a.refund_amount || 0,
                    net_amount: (a.consultation_fee || 0) - (a.refund_amount || 0),
                    payment_status: a.payment_status,
                    payment_id: a.payment_id,
                    refund_status: a.refund_status || null,
                    refund_id: a.refund_id || null,
                    doctor_name: a.Doctor?.full_name || 'N/A',
                    doctor_id: a.doctor_id,
                    patient_name: a.user?.name || 'N/A',
                    patient_id: a.patient_id,
                    reason: a.reason || null,
                    cancel_reason: a.cancel_reason || null,
                    cancel_by: a.cancel_by || null,
                    created_at: a.createdAt
                });
            }

            if (type !== 'refund') {
                const agg = await Appointments.findAll({
                    where: { ...where, refund_status: null },
                    attributes: [
                        [fn('SUM', col('consultation_fee')), 'total'],
                        [fn('COUNT', col('id')), 'count']
                    ], raw: true
                });
                summary.total_amount += parseFloat(agg[0]?.total || 0);
                summary.count += parseInt(agg[0]?.count || 0);
            }

            if (!type || type === 'refund') {
                const refundAgg = await Appointments.findAll({
                    where: { ...where, refund_status: { [Op.not]: null } },
                    attributes: [
                        [fn('SUM', col('refund_amount')), 'total'],
                        [fn('COUNT', col('id')), 'count']
                    ], raw: true
                });
                summary.total_refunds += parseFloat(refundAgg[0]?.total || 0);
            }
        }

        // ── Order Transactions ──
        if (!type || type === 'order') {
            const where = {};
            const dateFilter = buildDateFilter('createdAt', date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.payment_status = payment_status;

            if (search) {
                const userIds = (await Users.findAll({
                    where: { name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(u => u.id);
                where[Op.or] = [
                    { id: { [Op.like]: `%${search}%` } },
                    { user_id: { [Op.in]: userIds } },
                    { discount_code: { [Op.like]: `%${search}%` } }
                ];
            }

            const orders = await Orders.findAll({
                where,
                include: [
                    { model: Users, attributes: ['id', 'name', 'email', 'phone'], required: false },
                    { model: Payments, attributes: ['payment_reference_id', 'payment_status', 'amount'], required: false }
                ],
                order: [[sort_by === 'amount' ? 'total_amount' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            for (const o of orders) {
                results.push({
                    id: `ORDER-${o.id}`,
                    type: 'order',
                    date: o.createdAt?.toISOString?.()?.split('T')[0] || o.createdAt,
                    amount: o.total_amount || 0,
                    refund_amount: 0,
                    net_amount: o.total_amount || 0,
                    payment_status: o.payment_status,
                    payment_id: o.Payments?.[0]?.payment_reference_id || null,
                    doctor_name: null,
                    patient_name: o.User?.name || 'N/A',
                    patient_id: o.user_id,
                    status: o.status,
                    discount_code: o.discount_code || null,
                    created_at: o.createdAt
                });
            }

            const orderAgg = await Orders.findAll({
                where,
                attributes: [
                    [fn('SUM', col('total_amount')), 'total'],
                    [fn('COUNT', col('id')), 'count']
                ], raw: true
            });
            summary.total_amount += parseFloat(orderAgg[0]?.total || 0);
            summary.count += parseInt(orderAgg[0]?.count || 0);
        }

        // ── Payout Transactions ──
        if (!type || type === 'payout') {
            const where = {};
            const dateFilter = buildDateFilter('createdAt', date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.status = payment_status;

            if (search) {
                const doctorIds = (await Doctors.findAll({
                    where: { full_name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(d => d.id);
                where[Op.or] = [
                    { doctor_id: { [Op.in]: doctorIds } },
                    { transaction_id: { [Op.like]: `%${search}%` } },
                    { utr: { [Op.like]: `%${search}%` } },
                    { razorpay_payout_id: { [Op.like]: `%${search}%` } }
                ];
            }

            const payouts = await Payouts.findAll({
                where,
                include: [{ model: Doctors, attributes: ['id', 'full_name', 'email', 'phone'], required: false }],
                order: [[sort_by === 'amount' ? 'net_payout' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            for (const p of payouts) {
                results.push({
                    id: `PAYOUT-${p.id}`,
                    type: 'payout',
                    date: p.createdAt?.toISOString?.()?.split('T')[0] || p.createdAt,
                    amount: p.net_payout || 0,
                    total_earnings: p.total_earnings || 0,
                    platform_fee: p.platform_fee_amount || 0,
                    gst: p.gst_amount || 0,
                    total_deductions: p.total_deductions || 0,
                    payment_status: p.status,
                    transaction_id: p.transaction_id || null,
                    utr: p.utr || null,
                    doctor_name: p.Doctor?.full_name || 'N/A',
                    doctor_id: p.doctor_id,
                    from_date: p.from_date,
                    to_date: p.to_date,
                    processed_at: p.processed_at,
                    created_at: p.createdAt
                });
            }

            const payoutAgg = await Payouts.findAll({
                where,
                attributes: [
                    [fn('SUM', col('net_payout')), 'total'],
                    [fn('COUNT', col('id')), 'count']
                ], raw: true
            });
            summary.total_amount += parseFloat(payoutAgg[0]?.total || 0);
            summary.count += parseInt(payoutAgg[0]?.count || 0);
        }

        summary.net_revenue = summary.total_amount - summary.total_refunds;

        // Sort combined results
        const sortField = sort_by === 'amount' ? 'amount' : sort_by === 'date' ? 'date' : 'created_at';
        results.sort((a, b) => {
            const va = a[sortField] || '';
            const vb = b[sortField] || '';
            if (sort_order === 'ASC') return va > vb ? 1 : va < vb ? -1 : 0;
            return va < vb ? 1 : va > vb ? -1 : 0;
        });

        return res.response({
            success: true,
            data: results,
            summary,
            pagination: { page: pager.page, per_page: pager.perPage, total: results.length }
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

// ─────────────────────────────────────────────────────
// USER - Own Transactions (Appointments + Orders)
// ─────────────────────────────────────────────────────
const getUserTransactions = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const userId = session_user.user_id;
        const {
            page, limit, date_from, date_to,
            type, payment_status, search,
            sort_by = 'date', sort_order = 'DESC'
        } = req.query;

        const pager = paginate(page, limit);
        const results = [];
        let summary = { total_spent: 0, total_refunds: 0, net_spent: 0, appointment_count: 0, order_count: 0 };

        // ── User's Appointment Transactions ──
        if (!type || type === 'appointment' || type === 'refund') {
            const where = { patient_id: userId };
            const dateFilter = buildAppointmentDateFilter(date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.payment_status = payment_status;
            if (type === 'refund') where.refund_status = { [Op.not]: null };

            if (search) {
                const doctorIds = (await Doctors.findAll({
                    where: { full_name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(d => d.id);
                where[Op.or] = [
                    { payment_id: { [Op.like]: `%${search}%` } },
                    { refund_id: { [Op.like]: `%${search}%` } },
                    { doctor_id: { [Op.in]: doctorIds } }
                ];
            }

            const appointments = await Appointments.findAll({
                where,
                include: [
                    { model: Doctors, attributes: ['id', 'full_name', 'specialization', 'phone'], required: false }
                ],
                order: [[sort_by === 'amount' ? 'consultation_fee' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            for (const a of appointments) {
                results.push({
                    id: a.id,
                    type: a.refund_status ? 'refund' : 'appointment',
                    date: a.appointment_date,
                    time: a.appointment_time,
                    amount: a.consultation_fee || 0,
                    refund_amount: a.refund_amount || 0,
                    net_amount: (a.consultation_fee || 0) - (a.refund_amount || 0),
                    payment_status: a.payment_status,
                    payment_id: a.payment_id,
                    refund_status: a.refund_status || null,
                    refund_id: a.refund_id || null,
                    doctor_name: a.Doctor?.full_name || 'N/A',
                    doctor_specialization: a.Doctor?.specialization || null,
                    reason: a.reason || null,
                    status: a.status,
                    consultation_modes: a.consultation_modes || null,
                    created_at: a.createdAt
                });
            }

            if (type !== 'refund') {
                const agg = await Appointments.findAll({
                    where: { ...where, refund_status: null },
                    attributes: [
                        [fn('SUM', col('consultation_fee')), 'total'],
                        [fn('COUNT', col('id')), 'count']
                    ], raw: true
                });
                summary.total_spent += parseFloat(agg[0]?.total || 0);
                summary.appointment_count += parseInt(agg[0]?.count || 0);
            }

            const refundAgg = await Appointments.findAll({
                where: { patient_id: userId, refund_status: { [Op.not]: null } },
                attributes: [[fn('SUM', col('refund_amount')), 'total']], raw: true
            });
            summary.total_refunds += parseFloat(refundAgg[0]?.total || 0);
        }

        // ── User's Order Transactions ──
        if (!type || type === 'order') {
            const where = { user_id: userId };
            const dateFilter = buildDateFilter('createdAt', date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.payment_status = payment_status;

            if (search) {
                where[Op.or] = [
                    { id: { [Op.like]: `%${search}%` } },
                    { discount_code: { [Op.like]: `%${search}%` } }
                ];
            }

            const orders = await Orders.findAll({
                where,
                include: [
                    { model: Payments, attributes: ['payment_reference_id', 'payment_status', 'amount'], required: false }
                ],
                order: [[sort_by === 'amount' ? 'total_amount' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            for (const o of orders) {
                results.push({
                    id: `ORDER-${o.id}`,
                    type: 'order',
                    date: o.createdAt?.toISOString?.()?.split('T')[0] || o.createdAt,
                    amount: o.total_amount || 0,
                    refund_amount: 0,
                    net_amount: o.total_amount || 0,
                    payment_status: o.payment_status,
                    payment_id: o.Payments?.[0]?.payment_reference_id || null,
                    status: o.status,
                    discount_code: o.discount_code || null,
                    created_at: o.createdAt
                });
            }

            const orderAgg = await Orders.findAll({
                where,
                attributes: [
                    [fn('SUM', col('total_amount')), 'total'],
                    [fn('COUNT', col('id')), 'count']
                ], raw: true
            });
            summary.total_spent += parseFloat(orderAgg[0]?.total || 0);
            summary.order_count += parseInt(orderAgg[0]?.count || 0);
        }

        summary.net_spent = summary.total_spent - summary.total_refunds;

        const sortField = sort_by === 'amount' ? 'amount' : sort_by === 'date' ? 'date' : 'created_at';
        results.sort((a, b) => {
            const va = a[sortField] || '';
            const vb = b[sortField] || '';
            if (sort_order === 'ASC') return va > vb ? 1 : va < vb ? -1 : 0;
            return va < vb ? 1 : va > vb ? -1 : 0;
        });

        return res.response({
            success: true,
            data: results,
            summary,
            pagination: { page: pager.page, per_page: pager.perPage, total: results.length }
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

// ─────────────────────────────────────────────────────
// DOCTOR - Own Transactions (Consultations + Payouts)
// ─────────────────────────────────────────────────────
const getDoctorTransactions = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const doctorId = session_user.doctor_id;
        if (!doctorId) throw new Error('Doctor ID required');

        const {
            page, limit, date_from, date_to,
            type, payment_status, search,
            sort_by = 'date', sort_order = 'DESC'
        } = req.query;

        const pager = paginate(page, limit);
        const results = [];
        let summary = { total_earned: 0, total_refunds: 0, net_earned: 0, total_payouts: 0, pending_payout: 0, consultation_count: 0 };

        // ── Doctor's Consultation Transactions ──
        if (!type || type === 'consultation' || type === 'refund') {
            const where = { doctor_id: doctorId };
            const dateFilter = buildAppointmentDateFilter(date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.payment_status = payment_status;
            if (type === 'refund') where.refund_status = { [Op.not]: null };

            if (search) {
                const userIds = (await Users.findAll({
                    where: { name: { [Op.like]: `%${search}%` } },
                    attributes: ['id'], raw: true
                })).map(u => u.id);
                where[Op.or] = [
                    { payment_id: { [Op.like]: `%${search}%` } },
                    { refund_id: { [Op.like]: `%${search}%` } },
                    { patient_id: { [Op.in]: userIds } }
                ];
            }

            const appointments = await Appointments.findAll({
                where,
                include: [
                    { model: Users, as: 'user', attributes: ['id', 'name', 'email', 'phone'], required: false }
                ],
                order: [[sort_by === 'amount' ? 'consultation_fee' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true, nest: true
            });

            for (const a of appointments) {
                results.push({
                    id: a.id,
                    type: a.refund_status ? 'refund' : 'consultation',
                    date: a.appointment_date,
                    time: a.appointment_time,
                    amount: a.consultation_fee || 0,
                    refund_amount: a.refund_amount || 0,
                    net_amount: (a.consultation_fee || 0) - (a.refund_amount || 0),
                    payment_status: a.payment_status,
                    payment_id: a.payment_id,
                    refund_status: a.refund_status || null,
                    refund_id: a.refund_id || null,
                    patient_name: a.user?.name || 'N/A',
                    patient_id: a.patient_id,
                    reason: a.reason || null,
                    status: a.status,
                    cancel_reason: a.cancel_reason || null,
                    consultation_modes: a.consultation_modes || null,
                    created_at: a.createdAt
                });
            }

            if (type !== 'refund') {
                const agg = await Appointments.findAll({
                    where: { ...where, refund_status: null },
                    attributes: [
                        [fn('SUM', col('consultation_fee')), 'total'],
                        [fn('COUNT', col('id')), 'count']
                    ], raw: true
                });
                summary.total_earned += parseFloat(agg[0]?.total || 0);
                summary.consultation_count += parseInt(agg[0]?.count || 0);
            }

            const refundAgg = await Appointments.findAll({
                where: { doctor_id: doctorId, refund_status: { [Op.not]: null } },
                attributes: [[fn('SUM', col('refund_amount')), 'total']], raw: true
            });
            summary.total_refunds += parseFloat(refundAgg[0]?.total || 0);
        }

        // ── Doctor's Payout Transactions ──
        if (!type || type === 'payout') {
            const where = { doctor_id: doctorId };
            const dateFilter = buildDateFilter('createdAt', date_from, date_to);
            if (dateFilter) Object.assign(where, dateFilter);
            if (payment_status) where.status = payment_status;

            if (search) {
                where[Op.or] = [
                    { transaction_id: { [Op.like]: `%${search}%` } },
                    { utr: { [Op.like]: `%${search}%` } },
                    { razorpay_payout_id: { [Op.like]: `%${search}%` } }
                ];
            }

            const payouts = await Payouts.findAll({
                where,
                order: [[sort_by === 'amount' ? 'net_payout' : 'createdAt', sort_order]],
                offset: pager.offset, limit: pager.limit, raw: true
            });

            for (const p of payouts) {
                results.push({
                    id: `PAYOUT-${p.id}`,
                    type: 'payout',
                    date: p.createdAt?.toISOString?.()?.split('T')[0] || p.createdAt,
                    amount: p.net_payout || 0,
                    total_earnings: p.total_earnings || 0,
                    platform_fee: p.platform_fee_amount || 0,
                    gst: p.gst_amount || 0,
                    total_deductions: p.total_deductions || 0,
                    payment_status: p.status,
                    transaction_id: p.transaction_id || null,
                    utr: p.utr || null,
                    from_date: p.from_date,
                    to_date: p.to_date,
                    processed_at: p.processed_at,
                    created_at: p.createdAt
                });
            }

            const paidPayoutAgg = await Payouts.findAll({
                where: { ...where, status: 'processed' },
                attributes: [[fn('SUM', col('net_payout')), 'total']], raw: true
            });
            summary.total_payouts += parseFloat(paidPayoutAgg[0]?.total || 0);

            const pendingPayoutAgg = await Payouts.findAll({
                where: { ...where, status: 'pending' },
                attributes: [[fn('SUM', col('net_payout')), 'total']], raw: true
            });
            summary.pending_payout += parseFloat(pendingPayoutAgg[0]?.total || 0);
        }

        summary.net_earned = summary.total_earned - summary.total_refunds;

        const sortField = sort_by === 'amount' ? 'amount' : sort_by === 'date' ? 'date' : 'created_at';
        results.sort((a, b) => {
            const va = a[sortField] || '';
            const vb = b[sortField] || '';
            if (sort_order === 'ASC') return va > vb ? 1 : va < vb ? -1 : 0;
            return va < vb ? 1 : va > vb ? -1 : 0;
        });

        return res.response({
            success: true,
            data: results,
            summary,
            pagination: { page: pager.page, per_page: pager.perPage, total: results.length }
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

// ─────────────────────────────────────────────────────
// ADMIN - Transaction Summary Dashboard
// ─────────────────────────────────────────────────────
const getTransactionSummary = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') throw new Error('Unauthorized');

        const { date_from, date_to } = req.query;

        const apptDateFilter = buildAppointmentDateFilter(date_from, date_to);
        const orderDateFilter = buildDateFilter('createdAt', date_from, date_to);
        const payoutDateFilter = buildDateFilter('createdAt', date_from, date_to);

        const apptWhere = apptDateFilter || {};
        const orderWhere = orderDateFilter || {};
        const payoutWhere = payoutDateFilter || {};

        const [apptRevenue, orderRevenue, refundTotal, payoutTotal, appointmentStats, orderStats] = await Promise.all([
            Appointments.findAll({
                where: { ...apptWhere, payment_status: 'paid', refund_status: null },
                attributes: [[fn('SUM', col('consultation_fee')), 'total'], [fn('COUNT', col('id')), 'count']],
                raw: true
            }),
            Orders.findAll({
                where: { ...orderWhere, payment_status: 'paid' },
                attributes: [[fn('SUM', col('total_amount')), 'total'], [fn('COUNT', col('id')), 'count']],
                raw: true
            }),
            Appointments.findAll({
                where: { ...apptWhere, refund_status: { [Op.not]: null } },
                attributes: [[fn('SUM', col('refund_amount')), 'total'], [fn('COUNT', col('id')), 'count']],
                raw: true
            }),
            Payouts.findAll({
                where: payoutWhere,
                attributes: [
                    [fn('SUM', col('net_payout')), 'total'],
                    [fn('SUM', col('platform_fee_amount')), 'platform_fees'],
                    [fn('SUM', col('gst_amount')), 'gst'],
                    [fn('COUNT', col('id')), 'count']
                ],
                raw: true
            }),
            Appointments.findAll({
                where: apptWhere,
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'], raw: true
            }),
            Orders.findAll({
                where: orderWhere,
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                group: ['status'], raw: true
            })
        ]);

        const consultationRevenue = parseFloat(apptRevenue[0]?.total || 0);
        const productRevenue = parseFloat(orderRevenue[0]?.total || 0);
        const totalRefunds = parseFloat(refundTotal[0]?.total || 0);
        const totalPayouts = parseFloat(payoutTotal[0]?.total || 0);
        const platformFees = parseFloat(payoutTotal[0]?.platform_fees || 0);
        const totalGST = parseFloat(payoutTotal[0]?.gst || 0);

        return res.response({
            success: true,
            data: {
                revenue: {
                    consultation_revenue: consultationRevenue,
                    product_revenue: productRevenue,
                    total_revenue: consultationRevenue + productRevenue,
                    total_refunds: totalRefunds,
                    net_revenue: consultationRevenue + productRevenue - totalRefunds
                },
                payouts: {
                    total_payouts: totalPayouts,
                    platform_fees: platformFees,
                    gst: totalGST,
                    net_platform_income: platformFees + totalGST
                },
                counts: {
                    total_appointments: parseInt(apptRevenue[0]?.count || 0) + parseInt(refundTotal[0]?.count || 0),
                    total_orders: parseInt(orderRevenue[0]?.count || 0),
                    total_payouts: parseInt(payoutTotal[0]?.count || 0)
                },
                appointment_status_breakdown: appointmentStats,
                order_status_breakdown: orderStats
            }
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

module.exports = {
    getAdminTransactions,
    getUserTransactions,
    getDoctorTransactions,
    getTransactionSummary
};
