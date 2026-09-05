const Joi = require('joi');

const create_discounted_user_validator = Joi.object({
    user_id: Joi.number().required().messages({
        'number.base': 'User ID must be a number',
        'any.required': 'User ID is required',
    }),
    discount_id: Joi.number().required().messages({
        'number.base': 'Discount ID must be a number',
        'any.required': 'Discount ID is required',
    }),
});

const update_discounted_user_validator = Joi.object({
    user_id: Joi.number().allow(null).messages({
        'number.base': 'User ID must be a number',
    }),
    discount_id: Joi.number().allow(null).messages({
        'number.base': 'Discount ID must be a number',
    }),
    used_count: Joi.number().allow(null).messages({
        'number.base': 'Used count must be a number',
    }),
}).unknown();

const get_discounted_users_validator = Joi.object({
    page: Joi.number().required().messages({
        'number.base': 'Page must be a number',
        'any.required': 'Page is required',
    }),
    limit: Joi.number().allow(null).messages({
        'number.base': 'Limit must be a number',
    }),
});

module.exports = {
    create_discounted_user_validator,
    update_discounted_user_validator,
    get_discounted_users_validator,
};