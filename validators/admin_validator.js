const Joi = require('joi');

const login_admin = Joi.object({
    email: Joi.string().required().messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'any.required': 'Email is required',
    }),
})

const verify_otp_admin_validator = Joi.object({
    email: Joi.string().required().messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'any.required': 'Email is required',
    }),
    otp: Joi.string().required().messages({
        'string.base': 'OTP must be a string',
        'string.empty': 'OTP is required',
        'any.required': 'OTP is required',
    }),
})

const update_admin_profile = Joi.object({
    name: Joi.string().allow(null).messages({
        'string.base': 'Name must be a string',
        'string.empty': 'Name is required',
        'any.required': 'Name is required',
    }),
    email: Joi.string().required().messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'any.required': 'Email is required',
    }),
    profile_image_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Profile image ID must be a number',
        'number.integer': 'Profile image ID must be an integer',
    }),
})
const Create_admin = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Name must be a string',
        'string.empty': 'Name is required',
        'any.required': 'Name is required',
    }),
    email: Joi.string().required().messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'any.required': 'Email is required',
    }),
})
module.exports = {
    login_admin,
    verify_otp_admin_validator,
    update_admin_profile,
    Create_admin
}