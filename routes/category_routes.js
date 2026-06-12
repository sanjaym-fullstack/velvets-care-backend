
const {
    SessionValidator,

} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    CategoryController: {
        CreateCategory,
        UpdateCategory,
        DeleteCategory,
        GetCategoryById,
        AdminCategories,
        UserCategories,

    }
} = require('../controllers');
const {
    CategoryValidator: {
        createCategoryValidator,
        updateCategoryValidator,
        deleteCategoryValidator,
        fetchAdminCategoryValidator,
        fetchUserCategoryValidator,
        fetchSingleCategoryValidator

    }
} = require('../validators');
const {
    HeaderValidator,
} = require('../validators');
const tags = ["api", "Category"];

module.exports = [
    {
        method: 'POST',
        path: '/category',
        options: {
            description: 'Create a new category',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: createCategoryValidator,
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
        handler: CreateCategory
    },
    {
        method: 'PUT',
        path: '/category/{id}',
        options: {
            description: 'Update a category',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: updateCategoryValidator,
                params: fetchSingleCategoryValidator,
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
        handler: UpdateCategory
    },
    {
        method: 'DELETE',
        path: '/category/{id}',
        options: {
            description: 'Delete a category',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: deleteCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: DeleteCategory
    },
    {
        method: 'GET',
        path: '/category/{id}',
        options: {
            description: 'Get a single category',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: fetchSingleCategoryValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: GetCategoryById
    },
    {
        method: 'GET',
        path: '/category',
        options: {
            description: 'Get all categories',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchUserCategoryValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: UserCategories
    },
    {
        method: 'GET',
        path: '/admin/category',
        options: {
            description: 'Get all categories for admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchAdminCategoryValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },

        },
        handler: AdminCategories
    }
]

