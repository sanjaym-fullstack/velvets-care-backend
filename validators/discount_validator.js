const Joi = require('joi');

const create_discount_validator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Discount name must be a string',
        'string.empty': 'Discount name is required',
        'any.required': 'Discount name is required',
    }),
    code: Joi.string().required().messages({
        'string.base': 'Discount code must be a string',
        'string.empty': 'Discount code is required',
        'any.required': 'Discount code is required',
    }),
    type: Joi.string().valid('flat', 'percentage').required().messages({
        'string.base': 'Discount type must be a string',
        'string.empty': 'Discount type is required',
        'any.required': 'Discount type is required',
        'any.only': 'Discount type must be flat or percentage'
    }),
    value: Joi.number().required().messages({
        'number.base': 'Discount value must be a number',
        'any.required': 'Discount value is required',
    }),
    start_date: Joi.date().required().messages({
        'date.base': 'Start date must be a valid date',
        'any.required': 'Start date is required',
    }),
    end_date: Joi.date().required().messages({
        'date.base': 'End date must be a valid date',
        'any.required': 'End date is required',
    }),
    usage_limit: Joi.number().required().messages({
        'number.base': 'Usage limit must be a number',
        'any.required': 'Usage limit is required',
    }),
    is_active: Joi.boolean().required().messages({
        'boolean.base': 'is_active must be true or false',
        'any.required': 'is_active is required',
    }),
});

const update_discount_validator = Joi.object({
    name: Joi.string().allow(null).messages({
        'string.base': 'Discount name must be a string',
    }),
    code: Joi.string().allow(null).messages({
        'string.base': 'Discount code must be a string',
    }),
    type: Joi.string().valid('flat', 'percentage').allow(null).messages({
        'string.base': 'Discount type must be a string',
        'any.only': 'Discount type must be flat or percentage',
    }),
    value: Joi.number().allow(null).messages({
        'number.base': 'Discount value must be a number',
    }),
    start_date: Joi.date().allow(null).messages({
        'date.base': 'Start date must be a valid date',
    }),
    end_date: Joi.date().allow(null).messages({
        'date.base': 'End date must be a valid date',
    }),
    usage_limit: Joi.number().allow(null).messages({
        'number.base': 'Usage limit must be a number',
    }),
    is_active: Joi.boolean().allow(null).messages({
        'boolean.base': 'is_active must be true or false',
    }),
}).unknown();

const assign_discount_to_product_validator = Joi.object({
    discount_id: Joi.number().required().messages({
        'number.base': 'Discount ID must be a number',
        'any.required': 'Discount ID is required',
    }),
    product_id: Joi.number().required().messages({
        'number.base': 'Product ID must be a number',
        'any.required': 'Product ID is required',
    }),
    usage_limit: Joi.number().allow(null).messages({
        'number.base': 'Usage limit must be a number',
    }),
});

const assign_discount_to_user_validator = Joi.object({
    discount_id: Joi.number().required().messages({
        'number.base': 'Discount ID must be a number',
        'any.required': 'Discount ID is required',
    }),
    user_id: Joi.number().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required',
    }),
});

const validate_discount_usage_validator = Joi.object({
    discount_code: Joi.string().required().messages({
        'string.base': 'Discount code must be a string',
        'string.empty': 'Discount code is required',
        'any.required': 'Discount code is required',
    }),
    user_id: Joi.number().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required',
    }),
    product_id: Joi.number().required().messages({
        'number.base': 'Product ID must be a number',
        'any.required': 'Product ID is required',
    }),
});

const fetch_single_discount_validator = Joi.object({
    id: Joi.number().required().messages({
        'number.base': 'Discount ID must be a number',
        'any.required': 'Discount ID is required',
    }),
});

module.exports = {
    create_discount_validator,
    update_discount_validator,
    assign_discount_to_product_validator,
    assign_discount_to_user_validator,
    validate_discount_usage_validator,
    fetch_single_discount_validator
};