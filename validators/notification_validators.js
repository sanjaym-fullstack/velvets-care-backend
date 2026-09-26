const Joi = require('joi');

const fetchNotificationsSchema = Joi.object({
    search: Joi.string().optional().allow('').messages({
        'string.base': 'Search must be a string'
    }),
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).default(10).messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1'
    })
});

const markNotificationAsSeenSchema = Joi.object({
    notification_id: Joi.number().integer().required().messages({
        'any.required': 'Notification ID is required',
        'number.base': 'Notification ID must be a number',
        'number.integer': 'Notification ID must be an integer'
    })
});

const deleteNotificationSchema = Joi.object({
    notification_id: Joi.number().integer().required().messages({
        'any.required': 'Notification ID is required',
        'number.base': 'Notification ID must be a number',
        'number.integer': 'Notification ID must be an integer'
    })
});

module.exports = {
    fetchNotificationsSchema,
    markNotificationAsSeenSchema,
    deleteNotificationSchema
};