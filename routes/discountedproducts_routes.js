
const {
    SessionValidator,
    
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    DiscountedProductController: {
    CreateDiscountedProduct,
    UpdateDiscountedProduct,
    DeleteDiscountedProduct,
    GetDiscountedProducts

    }
} = require('../controllers');
const {
    DiscountedProductValidator: {
    create_discounted_product_validator,
    update_discounted_product_validator,
    get_discounted_products_validator,
    }
} = require('../validators');
const {
    HeaderValidator,
} = require('../validators');
const tags = ["api", "Discounted Products"];

module.exports = [
    {
        method: 'POST',
        path: '/discountedproducts',
        options: {
            description: 'Create a new discounted product',
            tags,
            pre: [SessionValidator],
            validate: {
                payload: create_discounted_product_validator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: CreateDiscountedProduct,
    },
    {
        method: 'PUT',
        path: '/discountedproducts/{id}',
        options: {
            description: 'Update an existing discounted product',
            tags,
            pre: [SessionValidator],
            validate: {
                params: update_discounted_product_validator.params,
                payload: update_discounted_product_validator.payload,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: UpdateDiscountedProduct,
    },
    {
        method: 'DELETE',
        path: '/discountedproducts/{id}',
        options: {
            description: 'Delete a discounted product',
            tags,
            pre: [SessionValidator],
            validate: {
                headers: HeaderValidator,
                params: update_discounted_product_validator.params,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: DeleteDiscountedProduct,
        },    
    },
    {
        method: 'GET',
        path: '/discountedproducts',
        options: {
            description: 'Get all discounted products with product and discount details',
            tags,
            pre: [SessionValidator],
            validate: {
                headers: HeaderValidator,
                query: get_discounted_products_validator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: GetDiscountedProducts,
        },  
    }
];