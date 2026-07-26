const {
    SessionValidator
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    UsersControllers: {
        request_otp_login,
        request_otp_register,
        verify_otp,
        validateusersession,
        logout,
        update_user,
        user_refresh_token,
        getusers,
        getuserData,
        CreateUserByAdmin,
        inactivateUser,
        reactivateUser,
    }
} = require('../controllers');
const {
    UserValidators: {
        login_user,
        verify_otp_validator,
        logout_user,
        update_user_profile,
        user_refresh_token_validator,
        get_user_list,
        register_user,
        inactivateUserValidator,
        singleUserValidator
    },
    HeaderValidator,
} = require('../validators');



const tags = ["api", "Users"];
module.exports = [

    {
        method: 'POST',
        path: '/user/login',
        options: {
            description: 'Login  user',
            tags,
            validate: {
                payload: login_user,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: request_otp_login,
        },
    },
    {
        method: 'POST',
        path: '/user/register',
        options: {
            description: 'register user',
            tags,
            validate: {
                payload: register_user,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: request_otp_register,
        },
    },
    {
        method: 'POST',
        path: '/user/verify-otp',
        options: {
            description: 'Verify OTP',
            tags,
            validate: {
                payload: verify_otp_validator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: verify_otp,
        }
    },

    {
        method: 'GET',
        path: '/user/validate-session',
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
                }
            },
        },
        handler: validateusersession,
    },
    {
        method: 'POST',
        path: '/user/logout',
        options: {
            description: 'Logout user',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: logout_user,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: logout,
    },
    {
        method: 'PUT',
        path: '/user/update-profile',
        options: {
            description: 'Update user profile',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: update_user_profile,
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
            handler: update_user,
        },
    },
    {
        method: 'POST',
        path: '/user/refresh-token',
        options: {
            description: 'Refresh user token',
            tags,
            validate: {
                headers: user_refresh_token_validator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: user_refresh_token,
    },
    {
        method: 'GET',
        path: '/users',
        options: {
            description: 'Get all users',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: get_user_list,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: getusers,
    }
    ,
    {
        method: 'GET',
        path: '/user/profile',
        options: {
            description: 'Get user profile',
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
        handler: getuserData,
    },
    {
        method: 'POST',
        path: '/admin/user',
        options: {
            description: 'Create user by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: update_user_profile,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: CreateUserByAdmin,
    },
    {
        method: 'POST',
        path: '/admin/user/{user_id}/inactivate',
        options: {
            description: 'Inactivate user by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                payload: inactivateUserValidator,
                params: singleUserValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: inactivateUser,
    },
    {
        method: 'POST',
        path: '/admin/user/{user_id}/reactivate',
        options: {
            description: 'Reactivate user by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: singleUserValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
        },
        handler: reactivateUser,
    }
];
