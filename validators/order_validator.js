const Joi = require('joi');

// Admin fetch orders
const fetchOrdersAdminValidator = Joi.object({
    page: Joi.number().default(1).messages({
        'number.base': 'Page must be a number',
    }),
    limit: Joi.number().default(10).messages({
        'number.base': 'Limit must be a number',
    }),
    search: Joi.string().allow(null).messages({
        'string.base': 'Search must be a string',
    }),
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
    from_date: Joi.date().allow(null).messages({
        'date.base': 'From date must be a valid date',
    }),
    to_date: Joi.date().allow(null).messages({
        'date.base': 'To date must be a valid date',
    })
});

// User fetch orders
const fetchUserOrdersValidator = Joi.object({
    page: Joi.number().default(1).messages({
        'number.base': 'Page must be a number',
    }),
    limit: Joi.number().default(10).messages({
        'number.base': 'Limit must be a number',
    }),
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
    from_date: Joi.date().allow(null).messages({
        'date.base': 'From date must be a valid date',
    }),
    to_date: Joi.date().allow(null).messages({
        'date.base': 'To date must be a valid date',
    })
});

// Update order status
const updateOrderStatusValidator = Joi.object({
    status: Joi.string().required().messages({
        'string.base': 'Status must be a string',
        'string.empty': 'Status is required',
        'any.required': 'Status is required',
    }),
    subject: Joi.string().required().messages({
        'string.base': 'Subject must be a string',
        'string.empty': 'Subject is required',
        'any.required': 'Subject is required',
    }),
    message: Joi.string().required().messages({
        'string.base': 'Message must be a string',
        'string.empty': 'Message is required',
        'any.required': 'Message is required',
    })
});

// Admin fetch payments
const fetchPaymentsAdminValidator = Joi.object({
    page: Joi.number().default(1).messages({
        'number.base': 'Page must be a number',
    }),
    limit: Joi.number().default(10).messages({
        'number.base': 'Limit must be a number',
    }),
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
    method: Joi.string().allow(null).messages({
        'string.base': 'Method must be a string',
    }),
    user_id: Joi.number().allow(null).messages({
        'number.base': 'User ID must be a number',
    })
});

// Fetch order by order_id / user_id (query)
const fetchOrderByIdValidator = Joi.object({
    order_id: Joi.number().allow(null).messages({
        'number.base': 'Order ID must be a number',
    }),
    user_id: Joi.number().allow(null).messages({
        'number.base': 'User ID must be a number',
    })
}).or('order_id', 'user_id').messages({
    'object.missing': 'Either order_id or user_id is required',
});

// Fetch order by params id
const fetchOrderParamsValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Order ID must be a number',
        'number.integer': 'Order ID must be an integer',
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
