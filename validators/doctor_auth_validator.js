const Joi = require('joi');

const login_doctor = Joi.object({
    phone: Joi.string().required().messages({
        'string.base': 'Phone number must be a string',
        'string.empty': 'Phone number is required',
        'any.required': 'Phone number is required',
    }),
})

const verify_otp = Joi.object({
    phone: Joi.string().required().messages({
        'string.base': 'Phone number must be a string',
        'string.empty': 'Phone number is required',
        'any.required': 'Phone number is required',
    }),
    otp: Joi.string().required().messages({
        'string.base': 'OTP must be a string',
        'string.empty': 'OTP is required',
        'any.required': 'OTP is required',
    }),
})
const logout_doctor = Joi.object({
    refresh_token: Joi.string().required().messages({
        'string.base': 'Refresh token must be a string',
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required',
    }),
})
const doctor_refresh_token_validator = Joi.object({
    refresh_token: Joi.string().required().messages({
        'string.base': 'Refresh token must be a string',
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required',
    }),
}).unknown()

const get_doctor_list = Joi.object({
    page: Joi.number().required().messages({
        'number.base': 'Page must be a number',
        'any.required': 'Page is required',
    }),
    limit: Joi.number().allow(null).messages({
        'number.base': 'Limit must be a number',
    }),
    searchquery: Joi.string().allow(null).messages({
        'string.base': 'Search query must be a string',
    }),
})
const update_doctor_profile_validator = Joi.object({
    email: Joi.string().email().optional().messages({
        'string.base': 'Email must be a string',
        'string.email': 'Email must be a valid email address',
    }),
    profile_image: Joi.any()
      .meta({ swaggerType: 'file' })
      .optional()
      .description('Profile image').messages({
      }),
}).or('email', 'profile_image').messages({
    'object.missing': 'At least one field (email or profile_image) is required'
})
module.exports = {
    login_doctor,
    verify_otp,
    logout_doctor,
    get_doctor_list,
    doctor_refresh_token_validator,
    update_doctor_profile_validator,
}