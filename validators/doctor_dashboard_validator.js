const Joi = require('joi');

const doctorDashboardQuery = Joi.object({
    year: Joi.number().integer().min(2020).max(2100).optional().messages({
        'number.base': 'Year must be a number',
        'number.integer': 'Year must be an integer',
        'number.min': 'Year must be 2020 or later',
        'number.max': 'Year must be 2100 or earlier'
    })
}).unknown();

module.exports = {
    doctorDashboardQuery
};
