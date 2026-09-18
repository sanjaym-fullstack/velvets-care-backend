const { SessionValidator } = require('../middlewares');
const {
    RefundController: {
        getAllRefunds,
        getDoctorRefunds,
        getUserRefunds
    }
} = require('../controllers');
const { HeaderValidator } = require('../validators');
const Joi = require('joi');

const tags = ['api', 'Refunds'];

const refundQueryValidator = Joi.object({
    page: Joi.number().optional(),
    limit: Joi.number().optional(),
    doctor_id: Joi.number().optional(),
    user_id: Joi.number().optional(),
    refund_status: Joi.string().optional().valid('processed', 'pending', 'failed'),
    from_date: Joi.string().optional(),
    to_date: Joi.string().optional(),
}).unknown();

module.exports = [
    {
        method: 'GET',
        path: '/admin/refunds',
        options: {
            description: 'Get all refunds with summary stats (admin)',
            tags,
            pre: [SessionValidator],
            validate: {
                query: refundQueryValidator,
                headers: HeaderValidator
            }
        },
        handler: getAllRefunds
    },
    {
        method: 'GET',
        path: '/doctor/refunds',
        options: {
            description: 'Get doctor own refunds with earnings impact',
            tags,
            pre: [SessionValidator],
            validate: {
                query: Joi.object({
                    page: Joi.number().optional(),
                    limit: Joi.number().optional(),
                    refund_status: Joi.string().optional(),
                }).unknown(),
                headers: HeaderValidator
            }
        },
        handler: getDoctorRefunds
    },
    {
        method: 'GET',
        path: '/user/refunds',
        options: {
            description: 'Get user own refunds',
            tags,
            pre: [SessionValidator],
            validate: {
                query: Joi.object({
                    page: Joi.number().optional(),
                    limit: Joi.number().optional(),
                }).unknown(),
                headers: HeaderValidator
            }
        },
        handler: getUserRefunds
    }
];
