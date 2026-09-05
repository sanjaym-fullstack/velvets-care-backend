const Joi = require('joi');

const clinicValidator = Joi.object({
    name: Joi.string().required().messages({
        'string.base': 'Name must be a string',
        'string.empty': 'Name is required',
        'any.required': 'Name is required',
    }),
    address: Joi.string().required().messages({
        'string.base': 'Address must be a string',
        'string.empty': 'Address is required',
        'any.required': 'Address is required',
    }),
    street: Joi.string().required().messages({
        'string.base': 'Street must be a string',
        'string.empty': 'Address is required',
        'any.required': 'Address is required',
    }),
    floor_number: Joi.string().required().messages({
        'string.base': 'Floor number must be a string',
        'string.empty': 'Floor number is required',
        'any.required': 'Floor number is required',
    }),
    area: Joi.string().required().messages({
        'string.base': 'Area must be a string',
        'string.empty': 'Area is required',
        'any.required': 'Area is required',
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
    pincode: Joi.string().required().messages({
        'string.base': 'Zip code must be a string',
        'string.empty': 'Zip code is required',
        'any.required': 'Zip code is required',
    }),
    landmark: Joi.string().required().messages({
        'string.base': 'Landmark must be a string',
        'string.empty': 'Landmark is required',
        'any.required': 'Landmark is required',
    }),
    phone: Joi.string().required().messages({
        'string.base': 'Phone number must be a string',
        'string.empty': 'Phone number is required',
        'any.required': 'Phone number is required',
    }),
    email: Joi.string().email().required().messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'string.email': 'Email must be a valid email address',
        'any.required': 'Email is required',
    }),
    profile_image: Joi.any()
      .meta({ swaggerType: 'file' })
      .description('clinic profile image').messages({
        'any.required': 'Image is required',
        'string.empty': 'Image is required',
      }),
      description: Joi.string().required().messages({
        'string.base': 'Description must be a string',
        'string.empty': 'Description is required',
        'any.required': 'Description is required',
      }),
});

module.exports ={
    clinicValidator,
    
}