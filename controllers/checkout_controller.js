'use strict';

const { Orders, OrderItems, Users, Payments, Products } = require('../models');
const { Op } = require('sequelize');
const { createRazorpayOrder, fetchPayment } = require('../helpers/razorpay');
const { MailFunctions } = require('../helpers');

// ================= Controller Functions =================

// Create Checkout / Order
const createCheckout = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) return res.response({ success: false, message: 'Session expired' }).code(401);

        const { items, discount_code } = req.payload;

        // Fetch products from DB for validation & server-side calculation
        const productIds = items.map(i => i.product_id);
        const products = await Products.findAll({
            where: { id: { [Op.in]: productIds } }
        });

        if (products.length !== productIds.length) {
            return res.response({ success: false, message: 'One or more products not found' }).code(404);
        }

        const productMap = {};
        products.forEach(p => { productMap[p.id] = p; });

        // Validate stock and calculate total server-side
        let calculatedTotal = 0;
        const orderItemsData = [];
        for (const item of items) {
            const product = productMap[item.product_id];
            if (product.stock < item.quantity) {
                return res.response({
                    success: false,
                    message: `Insufficient stock for product: ${product.name}`
                }).code(400);
            }
            const price = product.selling_price;
            const total = price * item.quantity;
            calculatedTotal += total;
            orderItemsData.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price,
                total
            });
        }

        // Create Order
        const order = await Orders.create({
            user_id: session_user.user_id,
            total_amount: calculatedTotal,
            status: 'pending',
            payment_status: 'pending',
            payment_method: 'razorpay',
            discount_code: discount_code || null
        });

        // Create Order Items with price and total
        const orderItems = orderItemsData.map(i => ({
            ...i,
            order_id: order.id
        }));
        await OrderItems.bulkCreate(orderItems);

        // Deduct stock
        for (const item of items) {
            await Products.decrement('stock', {
                by: item.quantity,
                where: { id: item.product_id }
            });
        }

        // Create Razorpay order
        const razorpayOrder = await createRazorpayOrder(calculatedTotal);

        // Save payment record with all fields
        await Payments.create({
            order_id: order.id,
            payment_status: 'pending',
            payment_method: 'razorpay',
            payment_reference_id: razorpayOrder.id,
            razorpay_order_id: razorpayOrder.id,
            amount: calculatedTotal,
            currency: 'INR'
        });

        // Send Email Notification to User
        const user = await Users.findByPk(session_user.user_id);
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
        return res.response({ success: false, message: error.message }).code(500);
    }
};

// Verify Payment
const verifyPayment = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) return res.response({ success: false, message: 'Session expired' }).code(401);

        const { order_id, razorpay_payment_id } = req.payload;

        const order = await Orders.findByPk(order_id);
        if (!order) return res.response({ success: false, message: 'Order not found' }).code(404);
        if (order.user_id !== session_user.user_id && !session_user.is_admin) {
            return res.response({ success: false, message: 'Unauthorized' }).code(403);
        }

        // Fetch payment to verify it was captured (auto-captured via payment_capture:1)
        const payment = await fetchPayment(razorpay_payment_id);

        if (payment.status !== 'captured') {
            throw new Error(`Payment status is ${payment.status}, expected captured`);
        }

        // Update payment status
        await Payments.update({
            payment_status: 'success',
            payment_reference_id: razorpay_payment_id,
            razorpay_payment_response: payment
        }, { where: { order_id } });

        // Update order status and payment_status
        await Orders.update({
            status: 'confirmed',
            payment_status: 'paid'
        }, { where: { id: order_id } });

        return res.response({
            success: true,
            message: 'Payment verified successfully',
            data: payment
        }).code(200);

    } catch (error) {
        console.error(error);
        return res.response({ success: false, message: error.message }).code(500);
    }
};

module.exports = {
    createCheckout,
    verifyPayment
};
