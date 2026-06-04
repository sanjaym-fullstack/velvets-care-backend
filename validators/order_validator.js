const Joi = require('joi');

// Admin fetch orders
const fetchOrdersAdminValidator = Joi.object({
    page: Joi.number().default(1),
    limit: Joi.number().default(10),
    search: Joi.string().allow(null),
    status: Joi.string().allow(null),
    from_date: Joi.date().allow(null),
    to_date: Joi.date().allow(null)
});

// User fetch orders
const fetchUserOrdersValidator = Joi.object({
    page: Joi.number().default(1),
    limit: Joi.number().default(10),
    status: Joi.string().allow(null),
    from_date: Joi.date().allow(null),
    to_date: Joi.date().allow(null)
});

// Update order status
const updateOrderStatusValidator = Joi.object({
    status: Joi.string().required(),
    subject: Joi.string().required(),
    message: Joi.string().required()
});

// Admin fetch payments
const fetchPaymentsAdminValidator = Joi.object({
    page: Joi.number().default(1),
    limit: Joi.number().default(10),
    status: Joi.string().allow(null),
    method: Joi.string().allow(null),
    user_id: Joi.number().allow(null)
});

// Fetch order by order_id / user_id (query)
const fetchOrderByIdValidator = Joi.object({
    order_id: Joi.number().allow(null),
    user_id: Joi.number().allow(null)
}).or('order_id', 'user_id');

// Fetch order by params id
const fetchOrderParamsValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'any.required': 'Order ID is required',
    }),
});

module.exports = {
    fetchOrdersAdminValidator,
    fetchUserOrdersValidator,
    updateOrderStatusValidator,
    fetchPaymentsAdminValidator,
    fetchOrderByIdValidator,
    fetchOrderParamsValidator
};
