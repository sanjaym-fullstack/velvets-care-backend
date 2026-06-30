const {
    SessionValidator
} = require('../middlewares');
const Boom = require('@hapi/boom');
const {
    DoctorDashboardController: {
        getDoctorDashboard
    }
} = require('../controllers');
const {
    DoctorDashboardValidator: {
        doctorDashboardQuery
    }
} = require('../validators');
const {
    HeaderValidator
} = require('../validators');

const tags = ["api", "Doctor", "Dashboard"];

module.exports = [
    {
        method: 'GET',
        path: '/doctor/dashboard',
        options: {
            description: 'Get doctor dashboard with summary stats and graph data',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                query: doctorDashboardQuery,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getDoctorDashboard
    }
];
