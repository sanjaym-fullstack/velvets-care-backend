
const {
    SessionValidator,
    
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    OrderController: {
     fetchOrdersAdmin,
    fetchUserOrders,
    updateOrderStatus,
    fetchPaymentsAdmin,
    fetchOrderById

    }
} = require('../controllers');
const {
    OrderValidator: {
    fetchOrdersAdminValidator,
    fetchUserOrdersValidator,
    updateOrderStatusValidator,
    fetchPaymentsAdminValidator,
    fetchOrderByIdValidator,
    fetchOrderParamsValidator
    },
    HeaderValidator,
} = require('../validators');

const tags = ["api", "Orders"];
module.exports = [
    {
        method: 'GET',
        path: '/admin/orders',
        options: {
            description: 'Get all orders',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchOrdersAdminValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: fetchOrdersAdmin,
    },
    {
        method: 'GET',
        path: '/user/orders',
        options: {
            description: 'Get all orders',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchUserOrdersValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: fetchUserOrders,
    },
    {
        method: 'PUT',        
        path: '/order/{id}',
        options: {
            description: 'Update order status',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: updateOrderStatusValidator,
                params: fetchOrderParamsValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: updateOrderStatus,    
    },
    {
        method: 'GET',
        path: '/admin/payments',
        options: {
            description: 'Get all payments',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchPaymentsAdminValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: fetchPaymentsAdmin,    
    },
    // {
    //     method: 'GET',
    //     path: '/user/payments',
    //     options: {
    //         description: 'Get all payments',
    //         tags,
    //         pre: [
    //             SessionValidator
    //         ],
    //         validate: {
    //             headers: HeaderValidator,
    //             query: fetchPaymentsAdminValidator,
    //         },
    //     },
    //     handler: fetchPaymentsUser,
    // },
    {
        method: 'GET',
        path: '/order/{id}',
        options: {
            description: 'Get order by id',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                params: fetchOrderParamsValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: fetchOrderById,
    },
    
            ]