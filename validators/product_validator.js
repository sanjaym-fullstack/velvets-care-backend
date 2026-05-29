const Joi = require('joi');

const createProductValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.empty': 'Product name is required',
        'any.required': 'Product name is required',
    }),
    mrp_price: Joi.number().required().messages({
        'number.empty': 'MRP price is required',
        'any.required': 'MRP price is required',
    }),
    selling_price: Joi.number().required().messages({
        'number.empty': 'Selling price is required',
        'any.required': 'Selling price is required',
    }),
    sku: Joi.string().required().messages({
        'string.empty': 'SKU is required',
        'any.required': 'SKU is required',
    }),
    category_id: Joi.number().integer().required().messages({
        'any.required': 'Category ID is required',
    }),
    sub_category_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Sub-category ID must be a number',
    }),
    brand_id: Joi.number().integer().required().messages({
        'any.required': 'Brand ID is required',
    }),
    tags: Joi.string().allow('', null),
    is_active: Joi.boolean().default(true),
    is_featured: Joi.boolean().default(false),
    is_new: Joi.boolean().default(false),
    stock: Joi.number().required().messages({
        'any.required': 'Stock is required',
    }),
    description: Joi.string().allow('', null),
});

const updateProductValidator = Joi.object({
    name: Joi.string().optional(),
    mrp_price: Joi.number().optional(),
    selling_price: Joi.number().optional(),
    sku: Joi.string().optional(),
    category_id: Joi.number().integer().optional(),
    sub_category_id: Joi.number().integer().allow(null),
    brand_id: Joi.number().integer().optional(),
    tags: Joi.string().allow('', null),
    is_active: Joi.boolean().optional(),
    is_featured: Joi.boolean().optional(),
    is_new: Joi.boolean().optional(),
    stock: Joi.number().optional(),
    description: Joi.string().allow('', null),
});

const deleteProductValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'any.required': 'Product ID is required',
    }),
});

const deleteProductImageValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'any.required': 'Product ID is required',
    }),
    imageId: Joi.number().integer().required().messages({
        'any.required': 'Image ID is required',
    }),
});

const uploadProductImagesValidator = Joi.object({
    product_id: Joi.number().integer().required().messages({
        'any.required': 'Product ID is required',
    }),
    files: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Product images'),
});

const fetchAdminProductValidator = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('', null),
});

const fetchUserProductValidator = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().allow('', null),
});

const fetchSingleProductValidator = Joi.object({
    id: Joi.number().integer().required(),
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
