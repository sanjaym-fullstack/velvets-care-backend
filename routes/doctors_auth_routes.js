
const {
    SessionValidator
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    DoctorAuthController: {
        doctor_request_otp,
        doctor_verify_otp,
        doctor_validate_session,
        doctor_logout,
        doctor_update_profile,
        doctor_refresh_token,
        getDoctorProfile
    }

} = require('../controllers');
const {
    DoctorAuthValidator: {
        login_doctor,
        verify_otp,
        logout_doctor,
        get_doctor_list,
        doctor_refresh_token_validator,
        update_doctor_profile_validator
    },
    HeaderValidator,
} = require('../validators');
;

const tags = ["api", "Doctor_Auth"];

module.exports = [
    {
        method: 'POST',
        path: '/doctor/send-otp',
        options: {
            description: 'Send otp to doctor',
            tags,
            validate: {
                payload: login_doctor,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: doctor_request_otp,
    },
    {
        method: 'POST',
        path: '/doctor/verify-otp',
        options: {
            description: 'Verify otp',
            tags,
            validate: {
                payload: verify_otp,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: doctor_verify_otp,
    },
    {
        method: 'GET',
        path: '/doctor/validate-session',
        options: {
            description: 'Check user session',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: doctor_validate_session,
    },
    {
        method: 'POST',
        path: '/doctor/logout',
        options: {
            description: 'Logout user',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: logout_doctor,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: doctor_logout,
    },
    {
        method: 'PUT',
        path: '/doctor/update-profile',
        options: {
            description: 'Update doctor profile',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: update_doctor_profile_validator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
            payload: {
                maxBytes: 5 * 1024 * 1024,
                parse: true,
                output: 'file',
                multipart: true,
                allow: 'multipart/form-data'
            },
            plugins: {
                'hapi-swagger': {
                    payloadType: 'form'
                }

            },
        },
        handler: doctor_update_profile,
    },
    {
        method: 'POST',
        path: '/doctor/refresh-token',
        options: {
            description: 'Refresh token',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: doctor_refresh_token_validator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: doctor_refresh_token,
    },
    {
        method: 'GET',
        path: '/doctor/profile',
        options: {
            description: 'Get doctor profile',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
        },
        handler: getDoctorProfile,
    }

];