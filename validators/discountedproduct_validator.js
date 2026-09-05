const Joi = require('joi');

const create_discounted_product_validator = Joi.object({
    product_id: Joi.number().required().messages({
        'number.base': 'Product ID must be a number',
        'any.required': 'Product ID is required',
    }),
    discount_id: Joi.number().required().messages({
        'number.base': 'Discount ID must be a number',
        'any.required': 'Discount ID is required',
    }),
    usage_limit: Joi.number().allow(null).messages({
        'number.base': 'Usage limit must be a number',
    }),
});

const update_discounted_product_validator = {
    params: Joi.object({
        id: Joi.number().integer().required().messages({
            'number.base': 'Discounted product ID must be a number',
            'number.integer': 'Discounted product ID must be an integer',
            'any.required': 'Discounted product ID is required',
        }),
    }),
    payload: Joi.object({
        product_id: Joi.number().allow(null).messages({
            'number.base': 'Product ID must be a number',
        }),
        discount_id: Joi.number().allow(null).messages({
            'number.base': 'Discount ID must be a number',
        }),
        usage_limit: Joi.number().allow(null).messages({
            'number.base': 'Usage limit must be a number',
        }),
    }),
};

const get_discounted_products_validator = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
    }),
});

module.exports = {
    create_discounted_product_validator,
    update_discounted_product_validator,
    get_discounted_products_validator,
};