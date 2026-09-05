const Joi = require('joi');
const { setDefaultHighWaterMark } = require('nodemailer/lib/xoauth2');

const createCategoryValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Category name must be a string',
        'string.empty': 'Category name is required',
        'any.required': 'Category name is required',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    category_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('category image').messages({
        'any.required': 'Image is required',
    }),
    is_active: Joi.boolean().default(true).messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const updateCategoryValidator = Joi.object({
    name: Joi.string().optional().messages({
        'string.base': 'Category name must be a string',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    category_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Category image').messages({
        'any.required': 'Image is required',
    }),
    is_active: Joi.boolean().optional().messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const deleteCategoryValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
        'any.required': 'Category ID is required',
    }),
});

const fetchAdminCategoryValidator = Joi.object({
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

const fetchUserCategoryValidator = Joi.object({
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

const fetchSingleCategoryValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
        'any.required': 'Category ID is required',
    }),
});

module.exports = {
    createCategoryValidator,
    updateCategoryValidator,
    deleteCategoryValidator,
    fetchAdminCategoryValidator,
    fetchUserCategoryValidator,
    fetchSingleCategoryValidator
};