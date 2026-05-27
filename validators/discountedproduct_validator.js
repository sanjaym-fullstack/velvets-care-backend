const Joi = require('joi');

const create_discounted_product_validator = Joi.object({
    product_id: Joi.number().required().messages({
        'any.required': 'Product ID is required',
    }),
    discount_id: Joi.number().required().messages({
        'any.required': 'Discount ID is required',
    }),
    usage_limit: Joi.number().allow(null).messages({
        'number.base': 'Usage limit must be a number',
    }),
});

const update_discounted_product_validator = {
    params: Joi.object({
        id: Joi.number().integer().required().messages({
            'any.required': 'Discounted product ID is required',
        }),
    }),
    payload: Joi.object({
        product_id: Joi.number().allow(null),
        discount_id: Joi.number().allow(null),
        usage_limit: Joi.number().allow(null),
    }),
};

const get_discounted_products_validator = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
});

module.exports = {
    create_discounted_product_validator,
    update_discounted_product_validator,
    get_discounted_products_validator,
};
