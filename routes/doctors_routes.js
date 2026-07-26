const {
    SessionValidator
} = require('../middlewares')
const Boom = require('@hapi/boom');
// src/routes/authRoutes.js
const {
    DoctorController: {
        createDoctor,
        updateBasicDetails,
        updateAddress,
        updateAvailability,
        updateStatus,
        doctorlist_user,
        doctorlist,
        fetch_single_doctor,
        fetch_popular_doctors,
        updateDoctoreDetailsByAdmin,
        deleteDoctor,
        CheckDoctorSlotsByAdmin

    }
} = require('../controllers');
const {
    DoctorValidator: {
        basicDetailsValidator,
        statusValidator,
        availabilityValidator,
        addressValidator,
        fecthdoctors_admin,
        fetchSingleDoctorValidator
    },
    HeaderValidator,
} = require('../validators');


const tags = ["api", "Doctor"];

module.exports = [
    {
        method: 'POST',
        path: '/doctor/create',
        options: {
            description: 'Create a new doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: basicDetailsValidator,
                headers: HeaderValidator,
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
        handler: createDoctor
    },
    {
        method: 'POST',
        path: '/doctor/{doctor_id}/update',
        options: {
            description: 'Update basic details of doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: basicDetailsValidator,
                params: fetchSingleDoctorValidator,
                headers: HeaderValidator,
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
        handler: updateBasicDetails
    },

    {
        method: 'POST',
        path: '/doctor/update-address',
        options: {
            description: 'Update address of doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: addressValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
            handler: updateAddress
        }
    },
    {
        method: 'POST',
        path: '/doctor/update-availability',
        options: {
            description: 'Update availability of doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: availabilityValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },
            },
            handler: updateAvailability
        }
    },
    {
        method: 'POST',
        path: '/doctor/update-status',
        options: {
            description: 'Update status of doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                payload: statusValidator,
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                },

            },
            handler: updateStatus
        }
    },
    {
        method: 'GET',
        path: '/doctor/list',
        options: {
            description: 'Get list of doctors',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fecthdoctors_admin,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: doctorlist_user
        }
    },

    {
        method: 'GET',
        path: '/admin/doctor/list',
        options: {
            description: 'Get list of doctors',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                query: fecthdoctors_admin,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: doctorlist
        }
    },

    {
        method: 'GET',
        path: '/user/doctor/{doctor_id}',
        options: {
            description: 'Get a single doctor',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleDoctorValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: fetch_single_doctor
        }
    },
    {
        method: 'GET',
        path: '/user/doctor/popular',
        options: {
            description: 'Get popular doctors',
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
            handler: fetch_popular_doctors
        }
    },
    {
        method: 'GET',
        path: '/admin/doctor/slots/{doctor_id}',
        options: {
            description: 'Get recommended doctors',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleDoctorValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: CheckDoctorSlotsByAdmin
        }
    },
    {
        method: 'PUT',
        path: '/admin/doctor/{doctor_id}',
        options: {
            description: 'Update doctor details by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleDoctorValidator,
                payload: basicDetailsValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: updateDoctoreDetailsByAdmin
        }
    },
    {
        method: 'DELETE',
        path: '/admin/doctor/{doctor_id}',
        options: {
            description: 'Delete doctor by admin',
            tags,
            pre: [
                SessionValidator
            ],
            validate: {
                headers: HeaderValidator,
                params: fetchSingleDoctorValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            },
            handler: deleteDoctor
        }
    }

];  