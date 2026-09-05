const Joi = require('joi');

const basicDetailsValidator = Joi.object({
  full_name: Joi.string().required().messages({
    'string.base': 'Full name must be a string',
    'string.empty': 'Full name is required',
    'any.required': 'Full name is required',
  }),
  gender: Joi.string().required().messages({
    'string.base': 'Gender must be a string',
    'string.empty': 'Gender is required',
    'any.required': 'Gender is required',
  }),
  date_of_birth: Joi.string().required().messages({
    'string.base': 'Date of birth must be a string',
    'string.empty': 'Date of birth is required',
    'any.required': 'Date of birth is required',
  }),
  phone: Joi.number().integer().required().messages({
    'number.base': 'Phone number must be a number',
    'number.integer': 'Phone number must be an integer',
    'any.required': 'Phone number is required',
  }),
  email: Joi.string().email().required().messages({
    'string.base': 'Email must be a string',
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  specialization: Joi.string().required().messages({
    'string.base': 'Specialization must be a string',
    'string.empty': 'Specialization is required',
    'any.required': 'Specialization is required',
  }),

  years_of_experience: Joi.number().integer().required().messages({
    'number.base': 'Years of experience must be a number',
    'number.integer': 'Years of experience must be an integer',
    'any.required': 'Years of experience is required',
  }),

  registration_number: Joi.string().required().messages({
    'string.base': 'Registration number must be a string',
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
    'number.integer': 'Consultation fee must be an integer',
  }),

  consultation_modes: Joi.string().allow(null).messages({
    'string.base': 'Consultation modes must be a string',
  }),

  languages_spoken: Joi.string().allow(null).optional().messages({
    'string.base': 'Languages spoken must be a string',
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
  status: Joi.boolean().required().messages({
    'boolean.base': 'Status must be true or false',
    'any.required': 'Status is required',
  }),
  verified: Joi.boolean().required().messages({
    'boolean.base': 'Verified must be true or false',
    'any.required': 'Verified is required',
  }),
});
const statusAdminValidator = Joi.object({
  doctor_id: Joi.number().required().messages({
    'number.base': 'Doctor ID must be a number',
    'any.required': 'Doctor ID is required',
  }),
  status: Joi.boolean().required().messages({
    'boolean.base': 'Status must be true or false',
    'any.required': 'Status is required',
  }),
  verified: Joi.boolean().required().messages({
    'boolean.base': 'Verified must be true or false',
    'any.required': 'Verified is required',
  }),
});

const availabilityValidator = Joi.object({
  availability: Joi.array().items(
    Joi.object({
      day: Joi.string().valid(
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
      ).required().messages({
        'string.base': 'Day must be a string',
        'string.empty': 'Day is required',
        'any.required': 'Day is required',
        'any.only': 'Day must be a valid day of the week',
      }),
      start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
        'string.base': 'Start time must be a string',
        'string.empty': 'Start time is required',
        'any.required': 'Start time is required',
        'string.pattern.base': 'Start time must be in HH:MM format (24-hour)',
      }),
      end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
        'string.base': 'End time must be a string',
        'string.empty': 'End time is required',
        'any.required': 'End time is required',
        'string.pattern.base': 'End time must be in HH:MM format (24-hour)',
      }),
    })
  ).required().messages({
    'array.base': 'Availability must be an array',
    'any.required': 'Availability is required',
  }),
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
    'string.base': 'Address must be a string',
    'string.empty': 'Address is required',
    'any.required': 'Address is required',
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
    'string.base': 'Zip code must be a string',
    'string.empty': 'Zip code is required',
    'any.required': 'Zip code is required',
  }),
  landmark: Joi.string().required().messages({
    'string.base': 'Landmark must be a string',
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
    'number.integer': 'Years of experience must be an integer',
  }),
  searchquery: Joi.string().allow(null).messages({
    'string.base': 'Search query must be a string',
  }),
  specialization: Joi.string().allow(null).messages({
    'string.base': 'Specialization must be a string',
  }),
  page: Joi.number().integer().allow(null).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
  }),
  limit: Joi.number().integer().allow(null).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
  }),

});

const fetchSingleDoctorValidator = Joi.object({
  doctor_id: Joi.number().integer().required().messages({
    'number.base': 'Doctor ID must be a number',
    'number.integer': 'Doctor ID must be an integer',
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