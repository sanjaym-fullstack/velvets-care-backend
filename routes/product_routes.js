
const {
    SessionValidator,
    
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    ProductController: {
         CreateProduct,
    UpdateProduct,
    DeleteProduct,
    DeleteProductImage,
    GetImagesByProduct,
    GetProductById,
    AdminProducts,
    UserProducts,
    UploadProductImage,

    }
} = require('../controllers');
const {
    ProductValidator: {
    createProductValidator,
    updateProductValidator,
    deleteProductValidator,
    deleteProductImageValidator,
    uploadProductImagesValidator,
    fetchAdminProductValidator,
    fetchUserProductValidator,
    fetchSingleProductValidator
    },
    HeaderValidator,
} = require('../validators');



const tags = ["api", "Products"];
module.exports = [
    {
        method: 'POST',
        path: '/products',
        options: {
            description: 'Create a new product',
        tags,
        pre: [
            SessionValidator
        ],
        
            validate: {
                payload: createProductValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: CreateProduct
    },
    {
        method: 'POST',
        path: '/products/{id}/images',
        options: {
          description: 'Create a new product image',
        tags,
        pre: [
            SessionValidator
        ],
            validate: {
                payload: uploadProductImagesValidator,
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
        handler: UploadProductImage,

    },
    {
        method: 'PUT',
        path: '/products/{id}',
        options: {
            description: 'Update a product',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: updateProductValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: UpdateProduct
    },
    {
        method: 'DELETE',
        path: '/products/{id}',
        options: {
            description: 'Delete a product',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: deleteProductValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: DeleteProduct
    },
    {
        method: 'DELETE',
        path: '/products/{id}/images/{imageId}',
        options: {
            description: 'Delete a product image',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: deleteProductImageValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: DeleteProductImage
    },

    {
        method: 'GET',
        path: '/admin/products',
        options: {
            description: 'Fetch a single product',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                query: fetchAdminProductValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: AdminProducts,

    },
    {
        method: 'GET',
        path: '/user/products',
        options: {
            description: 'Fetch all products',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchUserProductValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: UserProducts
    },
    // get imges by product id
    {
        method: 'GET',
        path: '/products/{id}/images',
        options: {
            description: 'Get images by product id',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleProductValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: GetImagesByProduct
    },

    // get product by id
    {
        method: 'GET',
        path: '/products/{id}',
        options: {
            description: 'Get product by id',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleProductValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: GetProductById
    }

];  