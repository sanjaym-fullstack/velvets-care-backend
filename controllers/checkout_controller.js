'use strict';

const { Orders, OrderItems, Users, Payments } = require('../models');
const { Op } = require('sequelize');
const { createRazorpayOrder, capturePayment } = require('../helpers/razorpay');
const { MailFunctions } = require('../helpers');

// ================= Controller Functions =================

// Create Checkout / Order
const createCheckout = async (req, res) => {
    try {
        const { user_id, items, total_amount, discount_code } = req.payload;

        // Create Order
        const order = await Orders.create({
            user_id,
            total_amount,
            status: 'pending',
            discount_code: discount_code || null
        });

        // Create Order Items
        const orderItems = items.map(i => ({
            order_id: order.id,
            product_id: i.product_id,
            quantity: i.quantity
        }));
        await OrderItems.bulkCreate(orderItems);

        // Create Razorpay order
        const razorpayOrder = await createRazorpayOrder(total_amount);

        // Save payment reference
        await Payments.create({
            order_id: order.id,
            payment_status: 'pending',
            payment_method: 'razorpay',
            payment_reference_id: razorpayOrder.id
        });

        // Send Email Notification to User
        const user = await Users.findByPk(user_id);
        const subject = 'Order Placed Successfully';
        const message = `Hi ${user.name}, your order #${order.id} has been placed.`;
        await MailFunctions.sendHtmlMailToSingleReceiver(
            user.email, user.name, process.env.MAIL_USER, 'Velvets Care', subject, message
        );

        return res.response({
            success: true,
            message: 'Order created successfully',
            data: { order, razorpayOrder }
        }).code(201);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// Verify Payment
const verifyPayment = async (req, res) => {
    try {
        const { order_id, razorpay_payment_id } = req.payload;

        const order = await Orders.findByPk(order_id);
        if (!order) throw new Error('Order not found');

        // Capture Payment
        const payment = await capturePayment(order.total_amount * 100, razorpay_payment_id);

        // Update payment status
        await Payments.update({
            payment_status: 'success',
            payment_reference_id: razorpay_payment_id
        }, { where: { order_id } });

        // Update order status
        await Orders.update({ status: 'confirmed' }, { where: { id: order_id } });

        return res.response({
            success: true,
            message: 'Payment verified successfully',
            data: payment
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(400);
    }
};

// Fetch User Orders
const fetchUserOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, start_date, end_date } = req.query;
        const user_id = req.headers.user.user_id;
        const offset = (page - 1) * limit;

        const where = { user_id };
        if (status) where.status = status;
        if (start_date && end_date) where.createdAt = { [Op.between]: [start_date, end_date] };

        const orders = await Orders.findAndCountAll({
            where,
            limit,
            offset,
            include: [OrderItems, Payments]
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

module.exports = {
    createCheckout,
    verifyPayment,
    fetchUserOrders
};
