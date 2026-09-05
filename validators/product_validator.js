const Joi = require('joi');

const createProductValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Product name must be a string',
        'string.empty': 'Product name is required',
        'any.required': 'Product name is required',
    }),
    mrp_price: Joi.number().required().messages({
        'number.base': 'MRP price must be a number',
        'any.required': 'MRP price is required',
    }),
    selling_price: Joi.number().required().messages({
        'number.base': 'Selling price must be a number',
        'any.required': 'Selling price is required',
    }),
    sku: Joi.string().required().messages({
        'string.base': 'SKU must be a string',
        'string.empty': 'SKU is required',
        'any.required': 'SKU is required',
    }),
    category_id: Joi.number().integer().required().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
        'any.required': 'Category ID is required',
    }),
    sub_category_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Sub-category ID must be a number',
        'number.integer': 'Sub-category ID must be an integer',
    }),
    brand_id: Joi.number().integer().required().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
        'any.required': 'Brand ID is required',
    }),
    tags: Joi.string().allow('', null).messages({
        'string.base': 'Tags must be a string',
    }),
    is_active: Joi.boolean().default(true).messages({
        'boolean.base': 'is_active must be true or false',
    }),
    is_featured: Joi.boolean().default(false).messages({
        'boolean.base': 'is_featured must be true or false',
    }),
    is_new: Joi.boolean().default(false).messages({
        'boolean.base': 'is_new must be true or false',
    }),
    stock: Joi.number().required().messages({
        'number.base': 'Stock must be a number',
        'any.required': 'Stock is required',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
});

const updateProductValidator = Joi.object({
    name: Joi.string().optional().messages({
        'string.base': 'Product name must be a string',
    }),
    mrp_price: Joi.number().optional().messages({
        'number.base': 'MRP price must be a number',
    }),
    selling_price: Joi.number().optional().messages({
        'number.base': 'Selling price must be a number',
    }),
    sku: Joi.string().optional().messages({
        'string.base': 'SKU must be a string',
    }),
    category_id: Joi.number().integer().optional().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
    }),
    sub_category_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Sub-category ID must be a number',
        'number.integer': 'Sub-category ID must be an integer',
    }),
    brand_id: Joi.number().integer().optional().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
    }),
    tags: Joi.string().allow('', null).messages({
        'string.base': 'Tags must be a string',
    }),
    is_active: Joi.boolean().optional().messages({
        'boolean.base': 'is_active must be true or false',
    }),
    is_featured: Joi.boolean().optional().messages({
        'boolean.base': 'is_featured must be true or false',
    }),
    is_new: Joi.boolean().optional().messages({
        'boolean.base': 'is_new must be true or false',
    }),
    stock: Joi.number().optional().messages({
        'number.base': 'Stock must be a number',
    }),
    description: Joi.string().allow('', null).messages({
        'string.base': 'Description must be a string',
    }),
});

const deleteProductValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Product ID must be a number',
        'number.integer': 'Product ID must be an integer',
        'any.required': 'Product ID is required',
    }),
});

const deleteProductImageValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Product ID must be a number',
        'number.integer': 'Product ID must be an integer',
        'any.required': 'Product ID is required',
    }),
    imageId: Joi.number().integer().required().messages({
        'number.base': 'Image ID must be a number',
        'number.integer': 'Image ID must be an integer',
        'any.required': 'Image ID is required',
    }),
});

const uploadProductImagesValidator = Joi.object({
    product_id: Joi.number().integer().required().messages({
        'number.base': 'Product ID must be a number',
        'number.integer': 'Product ID must be an integer',
        'any.required': 'Product ID is required',
    }),
    files: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Product images'),
});

const fetchAdminProductValidator = Joi.object({
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
    category_id: Joi.number().integer().optional().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
    }),
    sub_category_id: Joi.number().integer().optional().messages({
        'number.base': 'Sub-category ID must be a number',
        'number.integer': 'Sub-category ID must be an integer',
    }),
    brand_id: Joi.number().integer().optional().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
    }),
});

const fetchUserProductValidator = Joi.object({
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
    category_id: Joi.number().integer().optional().messages({
        'number.base': 'Category ID must be a number',
        'number.integer': 'Category ID must be an integer',
    }),
    sub_category_id: Joi.number().integer().optional().messages({
        'number.base': 'Sub-category ID must be a number',
        'number.integer': 'Sub-category ID must be an integer',
    }),
    brand_id: Joi.number().integer().optional().messages({
        'number.base': 'Brand ID must be a number',
        'number.integer': 'Brand ID must be an integer',
    }),
});

const fetchSingleProductValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Product ID must be a number',
        'number.integer': 'Product ID must be an integer',
        'any.required': 'Product ID is required',
    }),
});

module.exports = {
    createProductValidator,
    updateProductValidator,
    deleteProductValidator,
    deleteProductImageValidator,
    uploadProductImagesValidator,
    fetchAdminProductValidator,
    fetchUserProductValidator,
    fetchSingleProductValidator
};