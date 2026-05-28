const {
    SessionValidator,
} = require('../middlewares')
const Boom = require('@hapi/boom');
const {
    CheckoutController: {
        createCheckout,
        verifyPayment,
    }
} = require('../controllers');
const {
    CheckoutValidator: {
        checkoutValidator,
        verifyPaymentValidator,
    },
    HeaderValidator,
} = require('../validators');

const tags = ["api", "Checkout"];
module.exports = [
    {
        method: 'POST',
        path: '/checkout',
        options: {
            description: 'Create a new order',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: checkoutValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: createCheckout
    },
    {
        method: 'PUT',
        path: '/checkout/payment/verify',
        options: {
            description: 'Verify payment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: verifyPaymentValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: verifyPayment
    },
];
