'use strict';

const { Orders, OrderItems, Adresses, Users, Payments, Products, ProductImages } = require('../models');
const { Op } = require('sequelize');
const { MailFunctions, FileFunctions, NotificationHelper } = require('../helpers');

// ================= Order Controllers =================

// 1️⃣ Admin fetch orders with pagination, date filter, search query
const fetchOrdersAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);
        const { page = 1, limit = 10, search, status, from_date, to_date } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;
        if (search) {
            const searchNum = parseInt(search);
            if (!isNaN(searchNum)) where.id = searchNum;
        }
        if (from_date && to_date) {
            const endDate = new Date(to_date);
            endDate.setHours(23, 59, 59, 999);
            where.createdAt = { [Op.between]: [from_date, endDate] };
        }

        const orders = await Orders.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                { model: OrderItems, include: [{ model: Products, include: [ProductImages] }] },
                { model: Users, exclude: ['password', 'access_token', 'refresh_token'] },
                { model: Payments },
                { model: Adresses }
            ],
            order: [['createdAt', 'DESC']]
        });

        const mappedOrders = await Promise.all(orders.rows.map(async (order) => {
            const json = order.toJSON();
            if (json.OrderItems) {
                json.OrderItems = await Promise.all(json.OrderItems.map(async (item) => {
                    if (item.Product?.product_images) {
                        item.Product.product_images = await Promise.all(
                            item.Product.product_images.map(async (img) => ({
                                ...img,
                                file_url: img.file_url
                                    ? await FileFunctions.getFromS3(img.file_url)
                                    : null,
                            }))
                        );
                    }
                    return item;
                }));
            }
            return json;
        }));

        return res.response({
            success: true,
            message: 'Orders fetched successfully',
            data: mappedOrders,
            total: orders.count,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

// 2️⃣ User fetch orders
const fetchUserOrders = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) return res.response({ success: false, message: 'Unauthorized' }).code(401);
        const user_id = session_user.user_id;
        const { page = 1, limit = 10, status, from_date, to_date } = req.query;
        const offset = (page - 1) * limit;

        const where = { user_id };
        if (status) where.status = status;
        if (from_date && to_date) {
            const endDate = new Date(to_date);
            endDate.setHours(23, 59, 59, 999);
            where.createdAt = { [Op.between]: [from_date, endDate] };
        }

        const orders = await Orders.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                { model: OrderItems, include: [{ model: Products, include: [ProductImages] }] },
                { model: Payments },
                { model: Adresses }
            ],
            order: [['createdAt', 'DESC']]
        });

        const mappedOrders = await Promise.all(orders.rows.map(async (order) => {
            const json = order.toJSON();
            if (json.OrderItems) {
                json.OrderItems = await Promise.all(json.OrderItems.map(async (item) => {
                    if (item.Product?.product_images) {
                        item.Product.product_images = await Promise.all(
                            item.Product.product_images.map(async (img) => ({
                                ...img,
                                file_url: img.file_url
                                    ? await FileFunctions.getFromS3(img.file_url)
                                    : null,
                            }))
                        );
                    }
                    return item;
                }));
            }
            return json;
        }));

        return res.response({
            success: true,
            message: 'User orders fetched successfully',
            data: mappedOrders,
            total: orders.count,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

// 3️⃣ Update order status and send email notification
const updateOrderStatus = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);

        const { id } = req.params;
        const { status, subject, message } = req.payload;

        const order = await Orders.findByPk(id, { include: [Users] });
        if (!order) return res.response({ success: false, message: 'Order not found' }).code(404);

        await Orders.update({ status }, { where: { id } });

        await MailFunctions.sendHtmlMailToSingleReceiver(
            order.User.email, order.User.name,
            process.env.MAIL_USER, 'Velvets Care',
            subject, message
        );

        NotificationHelper.sendToUser(order.user_id,
            `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            `Your order #${order.id} status has been updated to ${status}. ${message || ''}`,
            { order_id: order.id, status }
        );

        return res.response({ success: true, message: 'Order status updated successfully' }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

// 4️⃣ Admin fetch all payments
const fetchPaymentsAdmin = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user || session_user.role !== 'ADMIN') return res.response({ success: false, message: 'Unauthorized' }).code(401);
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
        return res.response({ success: false, message: error.message }).code(500);
    }
};

// 5️⃣ Fetch order by order id
const fetchOrderById = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) return res.response({ success: false, message: 'Unauthorized' }).code(401);

        const { id } = req.params;

        const where = { id };
        if (!session_user.is_admin) {
            where.user_id = session_user.user_id;
        }

        const order = await Orders.findOne({
            where,
            include: [
                { model: OrderItems, include: [{ model: Products, include: [ProductImages] }] },
                { model: Payments },
                { model: Users }
            ]
        });

        if (!order) return res.response({ success: false, message: 'Order not found' }).code(404);

        const orderJSON = order.toJSON();
        if (orderJSON.OrderItems) {
            orderJSON.OrderItems = await Promise.all(orderJSON.OrderItems.map(async (item) => {
                if (item.Product?.product_images) {
                    item.Product.product_images = await Promise.all(
                        item.Product.product_images.map(async (img) => ({
                            ...img,
                            file_url: img.file_url
                                ? await FileFunctions.getFromS3(img.file_url)
                                : null,
                        }))
                    );
                }
                return item;
            }));
        }

        return res.response({
            success: true,
            message: 'Order fetched successfully',
            data: orderJSON
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

module.exports = {
    fetchOrdersAdmin,
    fetchUserOrders,
    updateOrderStatus,
    fetchPaymentsAdmin,
    fetchOrderById
};
