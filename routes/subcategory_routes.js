
const {
    SessionValidator,

} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    SubcategoryController: {
        CreateSubCategory,
        UpdateSubCategory,
        DeleteSubCategory,
        AdminSubCategories,
        UserSubCategories,
        GetSubCategoryById,
    }
} = require('../controllers');
const {
    SubCategoryValidator: {
        createSubCategoryValidator,
        updateSubCategoryValidator,
        deleteSubCategoryValidator,
        fetchAdminSubCategoryValidator,
        fetchUserSubCategoryValidator,
        fetchSingleSubCategoryValidator

    }
} = require('../validators');
const {
    HeaderValidator,
} = require('../validators');
const tags = ["api", "Subcategory"];

module.exports = [
    {
        method: 'POST',
        path: '/subcategory',
        options: {
            description: 'Create a new subcategory',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: createSubCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
            payload: {
                maxBytes: 20 * 1024 * 1024,
                parse: true,
                output: 'file',
                multipart: true,
                allow: 'multipart/form-data'
            },
            plugins: {
                'hapi-swagger': {
                    payloadType: 'form'
                }
            }
        },
        handler: CreateSubCategory
    },
    {
        method: 'PUT',
        path: '/subcategory/{id}',
        options: {
            description: 'Update a subcategory',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: updateSubCategoryValidator,
                params: fetchSingleSubCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
            payload: {
                maxBytes: 20 * 1024 * 1024,
                parse: true,
                output: 'file',
                multipart: true,
                allow: 'multipart/form-data'
            },
            plugins: {
                'hapi-swagger': {
                    payloadType: 'form'
                }
            }
        },
        handler: UpdateSubCategory
    },
    {
        method: 'DELETE',
        path: '/subcategory/{id}',
        options: {
            description: 'Delete a subcategory',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: deleteSubCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: DeleteSubCategory
    },
    {
        method: 'GET',
        path: '/subcategory/{id}',
        options: {
            description: 'Get a single subcategory',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: fetchSingleSubCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: GetSubCategoryById
    },
    {
        method: 'GET',
        path: '/admin/subcategory',
        options: {
            description: 'Get all subcategories for admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchAdminSubCategoryValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },

        },
        handler: AdminSubCategories
    },
    {
        method: 'GET',
        path: '/user/subcategory',
        options: {
            description: 'Get all subcategories for user',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchUserSubCategoryValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },

        },
        handler: UserSubCategories
    },
]