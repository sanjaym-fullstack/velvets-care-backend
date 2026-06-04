'use strict';
const Joi = require('joi');

const addAddressValidator = Joi.object({
    doctor_id: Joi.number().required().messages({
        'number.base': 'Doctor ID must be a number',
        'any.required': 'Doctor ID is required',
    }),
    street: Joi.string().allow('', null).optional(),
    area: Joi.string().allow('', null).optional(),
    city: Joi.string().required().messages({
        'string.empty': 'City is required',
        'any.required': 'City is required',
    }),
    state: Joi.string().required().messages({
        'string.empty': 'State is required',
        'any.required': 'State is required',
    }),
    country: Joi.string().required().messages({
        'string.empty': 'Country is required',
        'any.required': 'Country is required',
    }),
    zip: Joi.string().required().messages({
        'string.empty': 'Zip is required',
        'any.required': 'Zip is required',
    }),
    landmark: Joi.string().allow('', null).optional(),
    latitude: Joi.number().allow(null).optional(),
    longitude: Joi.number().allow(null).optional(),
});

const updateAddressValidator = Joi.object({
    street: Joi.string().allow('', null).optional(),
    area: Joi.string().allow('', null).optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    country: Joi.string().optional(),
    zip: Joi.string().optional(),
    landmark: Joi.string().allow('', null).optional(),
    latitude: Joi.number().allow(null).optional(),
    longitude: Joi.number().allow(null).optional(),
});

const addressIdParamValidator = Joi.object({
    id: Joi.number().required().messages({
        'number.base': 'Address ID must be a number',
        'any.required': 'Address ID is required',
    }),
});

const getAddressesValidator = Joi.object({
    doctor_id: Joi.number().optional().messages({
        'number.base': 'Doctor ID must be a number',
    }),
});

module.exports = {
    addAddressValidator,
    updateAddressValidator,
    addressIdParamValidator,
    getAddressesValidator,
};
