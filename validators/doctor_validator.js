const Joi = require('joi');

const basicDetailsValidator = Joi.object({
  full_name: Joi.string().required().messages({
    'string.empty': 'Full name is required',
    'any.required': 'Full name is required',
  }),
  gender: Joi.string().required().messages({
    'string.empty': 'Gender is required',
    'any.required': 'Gender is required',
  }),
  date_of_birth: Joi.string().required().messages({
    'string.empty': 'Date of birth is required',
    'any.required': 'Date of birth is required',
  }),
  phone: Joi.number().integer().required().messages({
    'any.required': 'Phone number is required',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
  }),
  specialization: Joi.string().required().messages({
    'string.empty': 'Specialization is required',
    'any.required': 'Specialization is required',
  }),

  years_of_experience: Joi.number().integer().required().messages({
    'number.base': 'Years of experience must be a number',
    'any.required': 'Years of experience is required',
  }),

  registration_number: Joi.string().required().messages({
    'string.empty': 'Registration number is required',
    'any.required': 'Registration number is required',
  }),

  registration_certificate: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Registration certificate image').messages({
      'any.required': 'Image is required',

    }),

  medical_degree_certificate: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Medical degree certificate image').messages({
      'any.required': 'Image is required',
    }),

  profile_image: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Profile image').messages({
      'any.required': 'Image is required',
    }),

  consultation_fee: Joi.number().integer().allow(null).messages({
    'number.base': 'Consultation fee must be a number',
  }),

  consultation_modes: Joi.string().allow(null).messages({
    'string.empty': 'Consultation modes is required',
  }),

  languages_spoken: Joi.string().allow(null).optional().messages({
    'string.empty': 'Languages spoken is required',
  }),

  government_id: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Government ID').messages({
      'any.required': 'Image is required',
    }),

  pan_card: Joi.any()
    .meta({ swaggerType: 'file' })
    .description('Pan card').messages({
      'any.required': 'Image is required',
    }),

});

const statusValidator = Joi.object({
  status: Joi.boolean().required(),
  verified: Joi.boolean().required(),
});

const availabilityValidator = Joi.object({
  availability: Joi.array().items(
    Joi.object({
      day: Joi.string().valid(
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ).required(),
      start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    })
  ).required(),
  doctor_id: Joi.number().required().messages({
    'number.base': 'Doctor ID must be a number',
    'any.required': 'Doctor ID is required',
  }),
});

const addressValidator = Joi.object({
  doctor_id: Joi.number().required().messages({
    'number.base': 'Doctor ID must be a number',
    'any.required': 'Doctor ID is required',
  }),
  address: Joi.string().required().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required',
  }),
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
    'string.empty': 'Zip code is required',
    'any.required': 'Zip code is required',
  }),
  landmark: Joi.string().required().messages({
    'string.empty': 'Landmark is required',
    'any.required': 'Landmark is required',
  }),
  latitude: Joi.number().required().messages({
    'number.base': 'Latitude must be a number',
    'any.required': 'Latitude is required',
  }),
  longitude: Joi.number().required().messages({
    'number.base': 'Longitude must be a number',
    'any.required': 'Longitude is required',
  }),
});

const fecthdoctors_admin = Joi.object({
  years_of_experience: Joi.number().integer().allow(null).messages({
    'number.base': 'Years of experience must be a number',
  }),
  searchquery: Joi.string().allow(null).messages({
    'string.empty': 'Search query is required',
  }),
  specialization: Joi.string().allow(null).messages({
    'string.empty': 'Specialization is required',
  }),
  page: Joi.number().integer().allow(null).messages({
    'string.empty': 'Page is required',
    'any.required': 'Page is required',
  }),
  limit: Joi.number().integer().allow(null).messages({
    'string.empty': 'Limit is required',
    'any.required': 'Limit is required',
  }),

});

const fetchSingleDoctorValidator = Joi.object({
  doctor_id: Joi.number().integer().required().messages({
    'number.base': 'Doctor ID must be a number',
    'any.required': 'Doctor ID is required',
  }),
});

module.exports = {
  basicDetailsValidator,
  statusValidator,
  availabilityValidator,
  addressValidator,
  fecthdoctors_admin,
  fetchSingleDoctorValidator
};