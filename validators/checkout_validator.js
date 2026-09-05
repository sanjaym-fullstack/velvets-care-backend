const Joi = require('joi');

const checkoutValidator = Joi.object({
    address_id: Joi.number().required().messages({
        'number.base': 'Address ID must be a number',
        'any.required': 'Address ID is required',
    }),
    items: Joi.array().items(
        Joi.object({
            product_id: Joi.number().required().messages({
                'number.base': 'Product ID must be a number',
                'any.required': 'Product ID is required',
            }),
            quantity: Joi.number().required().messages({
                'number.base': 'Quantity must be a number',
                'any.required': 'Quantity is required',
            }),
        })
    ).required().messages({
        'array.base': 'Items must be an array',
        'any.required': 'Items are required',
    }),
    total_amount: Joi.number().optional().messages({
        'number.base': 'Total amount must be a number',
    }),
    discount_code: Joi.string().allow(null).messages({
        'string.base': 'Discount code must be a string',
    }),
});

const verifyPaymentValidator = Joi.object({
    order_id: Joi.number().required().messages({
        'number.base': 'Order ID must be a number',
        'any.required': 'Order ID is required',
    }),
    razorpay_payment_id: Joi.string().required().messages({
        'string.base': 'Payment ID must be a string',
        'string.empty': 'Payment ID is required',
        'any.required': 'Payment ID is required',
    })
});

const fetchUserOrdersValidator = Joi.object({
    page: Joi.number().required().messages({
        'number.base': 'Page must be a number',
        'any.required': 'Page is required',
    }),
    limit: Joi.number().required().messages({
        'number.base': 'Limit must be a number',
        'any.required': 'Limit is required',
    }),
    status: Joi.string().allow(null).messages({
        'string.base': 'Status must be a string',
    }),
    start_date: Joi.date().allow(null).messages({
        'date.base': 'Start date must be a valid date',
    }),
    end_date: Joi.date().allow(null).messages({
        'date.base': 'End date must be a valid date',
    }),
});

module.exports = {
    checkoutValidator,
    verifyPaymentValidator,
    fetchUserOrdersValidator
};
