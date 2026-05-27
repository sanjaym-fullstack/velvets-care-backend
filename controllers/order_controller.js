'use strict';

const { Orders, OrderItems, Users, Payments, Products } = require('../models');
const { Op } = require('sequelize');
const { MailFunctions } = require('../helpers');

// ================= Order Controllers =================

// 1️⃣ Admin fetch orders with pagination, date filter, search query
const fetchOrdersAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.is_admin) throw new Error('Unauthorized');
        const { page = 1, limit = 10, search, status, from_date, to_date } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;
        if (search) {
            const searchNum = parseInt(search);
            if (!isNaN(searchNum)) where.id = searchNum;
        }
        if (from_date && to_date) where.createdAt = { [Op.between]: [from_date, to_date] };

        const orders = await Orders.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                { model: OrderItems, include: [Products] },
                { model: Users },
                { model: Payments }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.response({
            success: true,
            message: 'Orders fetched successfully',
            data: orders.rows,
            total: orders.count,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// 2️⃣ User fetch orders
const fetchUserOrders = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Unauthorized');
        const user_id = session_user.user_id;
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;

        const where = { user_id };
        if (status) where.status = status;

        const orders = await Orders.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                { model: OrderItems, include: [Products] },
                { model: Payments }
            ],
            order: [['createdAt', 'DESC']]
        });

        return res.response({
            success: true,
            message: 'User orders fetched successfully',
            data: orders.rows,
            total: orders.count,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// 3️⃣ Update order status and send email notification
const updateOrderStatus = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.is_admin) throw new Error('Unauthorized');
        const { order_id, status, subject, message } = req.payload;

        const order = await Orders.findByPk(order_id, { include: [Users] });
        if (!order) throw new Error('Order not found');

        await Orders.update({ status }, { where: { id: order_id } });

        // Send email notification
        await MailFunctions.sendHtmlMailToSingleReceiver(
            order.User.email, order.User.name,
            process.env.MAIL_USER, 'Velvets Care',
            subject, message
        );

        return res.response({ success: true, message: 'Order status updated successfully' }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// 4️⃣ Admin fetch all payments
const fetchPaymentsAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || !session_user.is_admin) throw new Error('Unauthorized');
        const { page = 1, limit = 10, status, method, user_id } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.payment_status = status;
        if (method) where.payment_method = method;
        if (user_id) where['$Order.user_id$'] = user_id;

        const payments = await Payments.findAndCountAll({
            where,
            limit,
            offset,
            include: [{ model: Orders, include: [Users] }],
            order: [['createdAt', 'DESC']]
        });

        return res.response({
            success: true,
            message: 'Payments fetched successfully',
            data: payments.rows,
            total: payments.count,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// 5️⃣ Fetch order by order id
const fetchOrderById = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Unauthorized');

        const { id } = req.params;

        const where = { id };
        if (!session_user.is_admin) {
            where.user_id = session_user.user_id;
        }

        const order = await Orders.findOne({
            where,
            include: [
                { model: OrderItems, include: [Products] },
                { model: Payments },
                { model: Users }
            ]
        });

        if (!order) throw new Error('Order not found');

        return res.response({
            success: true,
            message: 'Order fetched successfully',
            data: order
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

module.exports = {
    fetchOrdersAdmin,
    fetchUserOrders,
    updateOrderStatus,
    fetchPaymentsAdmin,
    fetchOrderById
};
