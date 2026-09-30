'use strict';

const { Orders, OrderItems, Adresses, Users, Payments, Products, ProductImages, Categories, Brands, Subcategories } = require('../models');
const { Op } = require('sequelize');
const { MailFunctions, FileFunctions, NotificationHelper, stripSensitive } = require('../helpers');
const { refundFullPayment } = require('../helpers/razorpay');
const { constants } = require('../config');

// Issues a 100% refund for a cancelled order. The Razorpay payment id lives on
// the Payments row rather than the order, so it is resolved from there.
const refundCancelledOrder = async (order) => {
    // Only a settled payment can be returned, and never twice.
    if (order.payment_status !== 'paid' || order.refund_status === 'processed') {
        return { id: null, amount: 0, status: order.refund_status || null, percent: 0 };
    }

    const payment = await Payments.findOne({
        where: { order_id: order.id, payment_reference_id: { [Op.ne]: null } },
        order: [['id', 'DESC']],
    });

    if (!payment?.payment_reference_id) {
        return { id: null, amount: 0, status: null, percent: 0 };
    }

    try {
        const refund = await refundFullPayment(payment.payment_reference_id, {
            reason: constants.REFUND.REASONS.ORDER_CANCEL,
            order_id: order.id,
        });

        return {
            id: refund.id,
            amount: refund.refund_amount_rupees || 0,
            status: refund.status || 'processed',
            percent: (refund.refund_amount_rupees || 0) > 0 ? 100 : 0,
        };
    } catch (err) {
        console.error(`Refund failed for order ${order.id}:`, err.message);
        return { id: null, amount: 0, status: 'failed', percent: 0 };
    }
};

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

        const [orderRows, orderCount] = await Promise.all([
            Orders.findAll({
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
            }),
            Orders.count({
                where
            }),
        ]);

        const mappedOrders = await Promise.all(orderRows.map(async (order) => {
            const json = order.toJSON();
            if (json.order_items) {
                json.order_items = await Promise.all(json.order_items.map(async (item) => {
                    if (item.product?.product_images) {
                        item.product.product_images = await Promise.all(
                            item.product.product_images.map(async (img) => ({
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
            total: orderCount,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
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

        const [userOrderRows, userOrderCount] = await Promise.all([
            Orders.findAll({
                where,
                limit,
                offset,
                include: [
                    { model: OrderItems, include: [{ model: Products, include: [ProductImages] }] },
                    { model: Payments },
                    { model: Adresses }
                ],
                order: [['createdAt', 'DESC']]
            }),
            Orders.count({
                where,
                include: [
                    { model: OrderItems, include: [{ model: Products, include: [ProductImages] }] },
                    { model: Payments },
                    { model: Adresses }
                ],
            }),
        ]);

        const mappedOrders = await Promise.all(userOrderRows.map(async (order) => {
            const json = order.toJSON();
            if (json.order_items) {
                json.order_items = await Promise.all(json.order_items.map(async (item) => {
                    if (item.product?.product_images) {
                        item.product.product_images = await Promise.all(
                            item.product.product_images.map(async (img) => ({
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
            total: userOrderCount,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
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

        // A cancelled order is refunded in full before the status is announced.
        let refund = null;
        if (status === 'cancelled') {
            refund = await refundCancelledOrder(order);
            await Orders.update({
                refund_id: refund.id,
                refund_amount: refund.amount,
                refund_status: refund.status,
                refund_date: refund.amount > 0 ? new Date() : null,
                refund_reason: constants.REFUND.REASONS.ORDER_CANCEL,
            }, { where: { id } });
        }

        await Orders.update({ status }, { where: { id } });

        await MailFunctions.sendHtmlMailToSingleReceiver(
            order.user.email, order.user.name,
            process.env.MAIL_USER, 'Velvets Care',
            subject, message
        );

        // Send specific notification based on status (one notification only)
        if (status === 'shipped') {
            NotificationHelper.sendToUser(order.user_id,
                'Order Shipped',
                `Great news! Your order #${order.id} has been shipped and is on its way.`,
                { order_id: order.id, status: 'shipped' }
            );
        } else if (status === 'delivered') {
            NotificationHelper.sendToUser(order.user_id,
                'Order Delivered',
                `Your order #${order.id} has been delivered successfully. Thank you for shopping with Velvets Care!`,
                { order_id: order.id, status: 'delivered' }
            );
        } else if (status === 'cancelled') {
            const refunded = refund && refund.amount > 0 && refund.status === 'processed';
            NotificationHelper.sendToUser(order.user_id,
                refunded ? 'Order Cancelled - Refund Initiated' : 'Order Cancelled',
                refunded
                    ? `Your order #${order.id} has been cancelled and a full refund of ₹${refund.amount} (100%) has been initiated. It will be credited in 5-7 business days.`
                    : `Your order #${order.id} has been cancelled. ${message || ''}`,
                refunded
                    ? { order_id: order.id, status: 'cancelled', refund_id: refund.id, refund_amount: refund.amount, refund_percent: 100 }
                    : { order_id: order.id, status: 'cancelled' }
            );

            if (refund && refund.status === 'failed') {
                NotificationHelper.sendToAllAdmins(
                    'Order Refund Failed',
                    `The refund for cancelled order #${order.id} (₹${order.total_amount}) failed. Please retry from the Razorpay dashboard.`,
                    { order_id: order.id, refund_status: 'failed' }
                );
            }
        } else {
            // Generic notification for other statuses (confirmed, processing, etc.)
            NotificationHelper.sendToUser(order.user_id,
                `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                `Your order #${order.id} status has been updated to ${status}. ${message || ''}`,
                { order_id: order.id, status }
            );
        }

        return res.response({
            success: true,
            message: 'Order status updated successfully',
            data: refund
                ? { order_id: order.id, status, refund_id: refund.id, refund_amount: refund.amount, refund_status: refund.status, refund_percent: refund.percent }
                : { order_id: order.id, status }
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
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

        const [paymentRows, paymentCount] = await Promise.all([
            Payments.findAll({
                where,
                limit,
                offset,
                include: [{ model: Orders, include: [Users] }],
                order: [['createdAt', 'DESC']]
            }),
            Payments.count({
                where,
                include: [{ model: Orders, include: [Users] }],
            }),
        ]);

        return res.response({
            success: true,
            message: 'Payments fetched successfully',
            data: paymentRows,
            total: paymentCount,
            page,
            limit
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
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
                { model: OrderItems, include: [{ model: Products, include: [ProductImages, Categories, Brands, Subcategories] }] },
                { model: Payments },
                { model: Users, attributes: { exclude: ['access_token', 'refresh_token'] } }
            ]
        });

        if (!order) return res.response({ success: false, message: 'Order not found' }).code(404);

        const orderJSON = order.toJSON();
        if (orderJSON.order_items) {
            orderJSON.order_items = await Promise.all(orderJSON.order_items.map(async (item) => {
                if (item.product?.product_images) {
                    item.product.product_images = await Promise.all(
                        item.product.product_images.map(async (img) => ({
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
            data: stripSensitive(orderJSON)
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
    }
};

module.exports = {
    fetchOrdersAdmin,
    fetchUserOrders,
    updateOrderStatus,
    fetchPaymentsAdmin,
    fetchOrderById
};
