const Joi = require('joi');

const DoctorUploadPrescriptionToUserValidator = Joi.object({
    user_id: Joi.number().integer().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'any.required': 'User ID is required',
    }),
    prescription_name: Joi.string().required().messages({
        'string.base': 'Prescription name must be a string',
        'string.empty': 'Prescription name cannot be empty',
        'any.required': 'Prescription name is required',
    }),
    file: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Prescription file')
        .required()
        .messages({
            'any.required': 'Prescription file is required',
        }),
});


const DoctorUploadPrescriptionSelfValidator = Joi.object({
    prescription_name: Joi.string().required().messages({
        'string.base': 'Prescription name must be a string',
        'string.empty': 'Prescription name cannot be empty',
        'any.required': 'Prescription name is required',
    }),
    file: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Prescription file')
        .required()
        .messages({
            'any.required': 'Prescription file is required',
        }),
});


const AdminUploadPrescriptionForUserValidator = Joi.object({
    user_id: Joi.number().integer().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'any.required': 'User ID is required',
    }),
    doctor_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Doctor ID must be a number',
        'number.integer': 'Doctor ID must be an integer',
    }),
    prescription_name: Joi.string().required().messages({
        'string.base': 'Prescription name must be a string',
        'string.empty': 'Prescription name cannot be empty',
        'any.required': 'Prescription name is required',
    }),
    file: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Prescription file')
        .required()
        .messages({
            'any.required': 'Prescription file is required',
        }),
});


const UserUploadPrescriptionValidator = Joi.object({
    prescription_name: Joi.string().required().messages({
        'string.base': 'Prescription name must be a string',
        'string.empty': 'Prescription name cannot be empty',
        'any.required': 'Prescription name is required',
    }),
    file: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Prescription file')
        .required()
        .messages({
            'any.required': 'Prescription file is required',
        }),
});


const UserFetchPrescriptionsValidator = Joi.object({
    page: Joi.number().integer().allow(null).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().required().messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'any.required': 'Limit is required',
    }),
    search: Joi.string().allow(null).messages({
        'string.base': 'Search must be a string',
    }),
    doctor_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Doctor ID must be a number',
        'number.integer': 'Doctor ID must be an integer',
    }),
});

const DoctorFetchPrescriptionsValidator = Joi.object({
    page: Joi.number().integer().allow(null).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().required().messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'any.required': 'Limit is required',
    }),
    user_id: Joi.number().integer().allow(null).messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
    }),
    from_date: Joi.date().allow(null).messages({
        'date.base': 'From date must be a valid date',
    }),
    to_date: Joi.date().allow(null).messages({
        'date.base': 'To date must be a valid date',
    }),
});

const AdminFetchPrescriptionsValidator = Joi.object({
    page: Joi.number().integer().allow(null).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
    }),
    limit: Joi.number().integer().required().messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'any.required': 'Limit is required',
    }),
    search: Joi.string().allow(null).messages({
        'string.base': 'Search must be a string',
    }),
    doctor_id: Joi.number().integer().allow(null).messages({
        'number.base': 'Doctor ID must be a number',
        'number.integer': 'Doctor ID must be an integer',
    }),
    user_id: Joi.number().integer().allow(null).messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
    }),
});

const DeletePrescriptionValidator = Joi.object({
    id: Joi.number().integer().required().messages({
        'number.base': 'Prescription ID must be a number',
        'number.integer': 'Prescription ID must be an integer',
        'any.required': 'Prescription ID is required',
    }),
});

const UpdatePrescriptionValidator = Joi.object({
    prescription_name: Joi.string().optional().messages({
        'string.base': 'Prescription name must be a string',
        'string.empty': 'Prescription name cannot be empty',
    }),
    file: Joi.any()
        .meta({ swaggerType: 'file' })
        .description('Prescription file')
        .optional(),
});

module.exports = {
    DoctorUploadPrescriptionToUserValidator,
    DoctorUploadPrescriptionSelfValidator,
    AdminUploadPrescriptionForUserValidator,
    UserUploadPrescriptionValidator,
    UserFetchPrescriptionsValidator,
    DoctorFetchPrescriptionsValidator,
    AdminFetchPrescriptionsValidator,
    DeletePrescriptionValidator,
    UpdatePrescriptionValidator
};