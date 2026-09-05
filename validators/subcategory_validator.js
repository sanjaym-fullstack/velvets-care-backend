const Joi = require('joi');

const createSubCategoryValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Subcategory name must be a string',
        'string.empty': 'Subcategory name is required',
        'any.required': 'Subcategory name is required',
    }),
    category_id: Joi.number().integer().required().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
        'any.required': 'Category ID is required',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    subcategory_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Subcategory image').messages({
        'any.required': 'Image is required',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    is_active: Joi.boolean().default(true).messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const updateSubCategoryValidator = Joi.object({
    name: Joi.string().optional().messages({
        'string.base': 'Subcategory name must be a string',
    }),
    slug: Joi.string().optional().messages({
        'string.base': 'Slug must be a string',
    }),
    subcategory_image: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Subcategory image').messages({
        'any.required': 'Image is required',
    }),
    category_id: Joi.number().integer().optional().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
    is_active: Joi.boolean().optional().messages({
        'boolean.base': 'is_active must be true or false',
    }),
});

const deleteSubCategoryValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Subcategory ID must be a number',
        'number.integer': 'Subcategory ID must be an integer',
        'any.required': 'Subcategory ID is required',
    }),
});

const fetchAdminSubCategoryValidator = Joi.object({
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

const fetchUserSubCategoryValidator = Joi.object({
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

const fetchSingleSubCategoryValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Subcategory ID must be a number',
        'number.integer': 'Subcategory ID must be an integer',
        'any.required': 'Subcategory ID is required',
    }),
});

module.exports = {
    createSubCategoryValidator,
    updateSubCategoryValidator,
    deleteSubCategoryValidator,
    fetchAdminSubCategoryValidator,
    fetchUserSubCategoryValidator,
    fetchSingleSubCategoryValidator
};