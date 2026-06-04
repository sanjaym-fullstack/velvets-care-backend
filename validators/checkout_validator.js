const Joi = require('joi');

const checkoutValidator = Joi.object({
    items: Joi.array().items(
        Joi.object({
            product_id: Joi.number().required(),
            quantity: Joi.number().required(),
        })
    ).required(),
    total_amount: Joi.number().optional(),
    discount_code: Joi.string().allow(null),
});

const verifyPaymentValidator = Joi.object({
    order_id: Joi.number().required(),
    razorpay_payment_id: Joi.string().required()
});

const fetchUserOrdersValidator = Joi.object({
    page: Joi.number().required(),
    limit: Joi.number().required(),
    status: Joi.string().allow(null),
    start_date: Joi.date().allow(null),
    end_date: Joi.date().allow(null),
});

module.exports = {
    checkoutValidator,
    verifyPaymentValidator,
    fetchUserOrdersValidator
};
