
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    AppointmentController: {
        precheckAndCreateOrder,
        confirmAppointment,
        cancelAppointmentByUser,
        getadminAppointments,
        getDoctorAppointments,
        doctoreject,
        callbackPayment,
        DoctorApproval,
        getUserAppointments,
        checkDoctorAvailability,
        getDoctorAvailableTimeSlots,
        getTodaysAppointmentsDoctor,
        UpdateAppointmentStatus,
        adminCreateAppointmentWithPaymentLink


    }
} = require('../controllers');
const {
    AppointmentValidator: {
        appointmentValidator,
        razorpayPaymentValidator,
        callbackValidator,
        cancelAppointmentValidator,
        fecthAppointmentsValidator,
        fetchdoctorAppointmentsValidator,
        appointment,
        slotcheckingValidator,
        UpdateAppointmentStatusParams,
        updateAppointmentStatusValidator,
        createAppointmentAdminValidator
    },
    HeaderValidator,
} = require('../validators');
const {
    SessionValidator
} = require('../middlewares');
const Joi = require('joi');
const { createRazorpayOrder } = require('../helpers/razorpay');

const tags = ["api", "Appointment"];

module.exports = [
    {
        method: 'POST',
        path: '/appointment/payment',
        options: {
            description: 'payment for an appointment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: razorpayPaymentValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: precheckAndCreateOrder,
    },
    {
        method: 'POST',
        path: '/appointment/doctor-availability/check',
        options: {
            description: 'dr availability check',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: razorpayPaymentValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: checkDoctorAvailability,
    },
    {
        method: 'POST',
        path: '/appointment/confirm',
        options: {
            description: 'Confirm an appointment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: appointmentValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: confirmAppointment,
    },
    {
        method: 'POST',
        path: '/appointment/{id}/callback',
        options: {
            description: 'Callback for an appointment payment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: appointment,
                payload: callbackValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: callbackPayment,
    },
    {
        method: 'POST',
        path: '/appointment/{id}/cancel',
        options: {
            description: 'Cancel an appointment by user',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: appointment,
                payload: cancelAppointmentValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: cancelAppointmentByUser,
    },
    {
        method: 'GET',
        path: '/admin/appointments',
        options: {
            description: 'Get all appointments',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fecthAppointmentsValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getadminAppointments,
    },
    {
        method: 'GET',
        path: '/doctor/appointments',
        options: {
            description: 'Get all appointments',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fetchdoctorAppointmentsValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getDoctorAppointments,
    },
    {
        method: 'POST',
        path: '/appointment/{id}/reject',
        options: {
            description: 'Reject an appointment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: appointment,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: doctoreject,
    },
    {
        method: 'POST',
        path: '/appointment/{id}/approve',
        options: {
            description: 'Approve an appointment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: appointment,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: DoctorApproval,
    },

    {
        method: 'POST',
        path: '/razorpay',
        options: {
            description: 'Create razorpay order',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: Joi.object({
                    amount: Joi.number().required()
                }),
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: async (request, h) => {
            const amount = request.payload.amount;
            const order = await createRazorpayOrder(amount);
            return h.response(order).code(200);
        }
    },
    {
        method: 'GET',
        path: '/user/appointments',
        options: {
            description: 'Get all appointments',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getUserAppointments,
    },
    {
        method: 'POST',
        path: '/appointment/check-slot',
        options: {
            description: 'Check doctor availability',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: slotcheckingValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getDoctorAvailableTimeSlots,
    },
    {
        method: 'GET',
        path: '/doctor/today/appointments',
        options: {
            description: 'Get todays first appointment',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getTodaysAppointmentsDoctor,
    },
    {
        method: 'PUT',
        path: '/appointment/{appointmentId}/status',
        options: {
            description: 'Update appointment status',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: UpdateAppointmentStatusParams,
                payload: updateAppointmentStatusValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: UpdateAppointmentStatus,
    },
    //     {
    //         method: 'PUT',
    //         path: '/admin/appointment/{id}/status',
    //         options: {
    //             description: 'Update appointment status',
    //             tags,
    //             pre: [
    //                 SessionValidator
    //             ],
    //             validate: {
    //                 headers: HeaderValidator,
    //                 params: appointment,
    //             payload: Joi.object({
    //                 status: Joi.string().valid('completed', 'no_show').required()
    //             }),
    //             failAction: (request, h, err) => {
    //                 const errors = err.details.map(e => e.message);
    //                 throw Boom.badRequest(errors.join(', '));
    //             }
    //         },
    //     },
    //     handler: UpdateAppointmentStatus,
    // }

    {

        method: 'POST',
        path: '/admin/appointment/create-with-payment-link',
        options: {
            description: 'Create an appointment with payment link by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: createAppointmentAdminValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: adminCreateAppointmentWithPaymentLink,
    },
    // {
    //     method: 'POST',
    //     path: '/admin/',
    //     options: {
    //         description: 'Cancel an appointment by admin',
    //         tags,
    //         pre: [
    //             SessionValidator
    //         ],
    //         validate: {
    //             headers: HeaderValidator,
    //             params: appointment,
    //             payload: cancelAppointmentValidator,
    //             failAction: (request, h, err) => {
    //                 const errors = err.details.map(e => e.message);
    //                 throw Boom.badRequest(errors.join(', '));
    //             }
    //         },
    //     },
    //     handler: adminCancelAppointment,
    // }
]