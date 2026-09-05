'use strict';
const Joi = require('joi');

const addAddressValidator = Joi.object({
    street: Joi.string().allow('', null).optional().messages({
        'string.base': 'Street must be a string',
    }),
    area: Joi.string().allow('', null).optional().messages({
        'string.base': 'Area must be a string',
    }),
    city: Joi.string().required().messages({
        'string.base': 'City must be a string',
        'string.empty': 'City is required',
        'any.required': 'City is required',
    }),
    state: Joi.string().required().messages({
        'string.base': 'State must be a string',
        'string.empty': 'State is required',
        'any.required': 'State is required',
    }),
    country: Joi.string().required().messages({
        'string.base': 'Country must be a string',
        'string.empty': 'Country is required',
        'any.required': 'Country is required',
    }),
    zip: Joi.string().required().messages({
        'string.base': 'Zip must be a string',
        'string.empty': 'Zip is required',
        'any.required': 'Zip is required',
    }),
    landmark: Joi.string().allow('', null).optional().messages({
        'string.base': 'Landmark must be a string',
    }),
    latitude: Joi.number().allow(null).optional().messages({
        'number.base': 'Latitude must be a number',
    }),
    longitude: Joi.number().allow(null).optional().messages({
        'number.base': 'Longitude must be a number',
    }),
});

const updateAddressValidator = Joi.object({
    street: Joi.string().allow('', null).optional().messages({
        'string.base': 'Street must be a string',
    }),
    area: Joi.string().allow('', null).optional().messages({
        'string.base': 'Area must be a string',
    }),
    city: Joi.string().optional().messages({
        'string.base': 'City must be a string',
    }),
    state: Joi.string().optional().messages({
        'string.base': 'State must be a string',
    }),
    country: Joi.string().optional().messages({
        'string.base': 'Country must be a string',
    }),
    zip: Joi.string().optional().messages({
        'string.base': 'Zip must be a string',
    }),
    landmark: Joi.string().allow('', null).optional().messages({
        'string.base': 'Landmark must be a string',
    }),
    latitude: Joi.number().allow(null).optional().messages({
        'number.base': 'Latitude must be a number',
    }),
    longitude: Joi.number().allow(null).optional().messages({
        'number.base': 'Longitude must be a number',
    }),
});

const addressIdParamValidator = Joi.object({
    id: Joi.number().required().messages({
        'number.base': 'Address ID must be a number',
        'any.required': 'Address ID is required',
    }),
});

module.exports = {
    addAddressValidator,
    updateAddressValidator,
    addressIdParamValidator,
};