const {
    NotificationValidator: {
        fetchNotificationsValidator,
        markNotificationAsReadValidator,
        deleteNotificationValidator,
    },
    HeaderValidator
} = require('../validators');

const {
    NotificationController: {
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification
    }
} = require('../controllers');

const Boom = require('@hapi/boom');

module.exports = [
    {
        method: 'GET',
        path: '/notifications',
        options: {
            description: 'Fetch notifications for a user',
            tags: ['api', 'Notifications'],
            validate: {
                headers: HeaderValidator,
                query: fetchNotificationsValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            }
        },
        handler: fetchNotifications
    },
    {
        method: 'POST',
        path: '/notifications/{notification_id}/read',
        options: {
            description: 'Mark a notification as read',
            tags: ['api', 'Notifications'],
            validate: {
                headers: HeaderValidator,
                payload: markNotificationAsReadValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            }
        },
        handler: markNotificationAsRead
    },
    {
        method: 'POST',
        path: '/notifications/all/read',
        options: {
            description: 'Mark all notifications as read',
            tags: ['api', 'Notifications'],
            validate: {
                headers: HeaderValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            }
        },
        handler: markAllNotificationsAsRead
    },
    {
        method: 'DELETE',
        path: '/notifications/{notification_id}',
        options: {
            description: 'Delete a notification',
            tags: ['api', 'Notifications'],
            validate: {
                headers: HeaderValidator,
                payload: deleteNotificationValidator,
                failAction: (request, h, err) => {
                    const errors = err.details.map(e => e.message);
                    throw Boom.badRequest(errors.join(', '));
                }
            }
        },
        handler: deleteNotification
    }
];