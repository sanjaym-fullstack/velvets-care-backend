
const {
    SessionValidator,
    
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    BrandController: {
    CreateBrand,
  UpdateBrand,
  DeleteBrand,
  AdminBrands,
  UserBrands,
  GetBrandById,
    }
} = require('../controllers');
const {
    BrandValidator: {
    createBrandValidator,
    updateBrandValidator,
    deleteBrandValidator,
    fetchAdminBrandValidator,
    fetchUserBrandValidator,
    fetchSingleBrandValidator   

    }
} = require('../validators');
const {
    HeaderValidator,
} = require('../validators');
const tags = ["api", "Brand"];
module.exports = [
    {
        method: 'POST',
        path: '/brand',
        options: {
            description: 'Create a new brand',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: createBrandValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
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
        handler: CreateBrand
    },
    {
        method: 'PUT',
        path: '/brand/{id}',
        options: {
            description: 'Update a brand',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: updateBrandValidator,
                params: fetchSingleBrandValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
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
        handler: UpdateBrand
    },
    {
        method: 'DELETE',
        path: '/brand/{id}',
        options: {
            description: 'Delete a brand',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: deleteBrandValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: DeleteBrand               
    },
    {
        method: 'GET',
        path: '/brand/{id}',
        options: {
            description: 'Get a brand by ID',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleBrandValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: GetBrandById
    },
    {
        method: 'GET',
        path: '/brand',
        options: {
            description: 'Get all brands',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchAdminBrandValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: AdminBrands
    },
    {
        method: 'GET',
        path: '/brand/user',
        options: {
            description: 'Get user brands',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchUserBrandValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: UserBrands
    }
];