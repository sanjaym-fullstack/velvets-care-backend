const Joi = require('joi');

const createBrandValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Brand name must be a string',
        'string.empty': 'Brand name is required',
        'any.required': 'Brand name is required',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    brand_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Brand image').messages({
        'any.required': 'Image is required',
    }),
    is_active: Joi.boolean().default(true).messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const updateBrandValidator = Joi.object({
    name: Joi.string().optional().messages({
        'string.base': 'Brand name must be a string',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    brand_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Brand image').messages({
        'any.required': 'Image is required',
    }),
    is_active: Joi.boolean().optional().messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const deleteBrandValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
        'any.required': 'Brand ID is required',
    }),
});

const fetchAdminBrandValidator = Joi.object({
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
    search: Joi.string().allow('', null).messages({
        'string.base': 'Search must be a string',
    }),
});

const fetchUserBrandValidator = Joi.object({
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
    search: Joi.string().allow('', null).messages({
        'string.base': 'Search must be a string',
    }),
});

const fetchSingleBrandValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
        'any.required': 'Brand ID is required',
    }),
});

module.exports = {
    createBrandValidator,
    updateBrandValidator,
    deleteBrandValidator,
    fetchAdminBrandValidator,
    fetchUserBrandValidator,
    fetchSingleBrandValidator
};