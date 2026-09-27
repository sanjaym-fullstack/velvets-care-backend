const {
    Users,
    Doctors,
    Notifications
} = require('../models');


const fetchNotifications = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");

        const { limit, offset, search } = req.query;
        const notifications = await Notifications.findAll({
            where: { user_id: session_user.role == "USER" ? session_user.user_id : session_user.doctor_id, role: session_user.role, ...(search ? { message: { [Op.like]: `%${search}%` } } : {}) },
            order: [['createdAt', 'DESC']],
            limit: limit ? parseInt(limit) : 10,
            offset: offset ? parseInt(offset) : 0,
            include: [{
                model: session_user.role === 'USER' ? Users : Doctors,
                attributes: ['id', 'name', 'email']
            }]
        });
        return res.response({
            success: true,
            message: "Notifications fetched",
            data: notifications
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong',
        });
    }
};


const markNotificationAsRead = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");
        const { notification_id } = req.params;

        const notification = await Notifications.findOne({
            where: {
                id: notification_id,
                role: session_user.role
            },
        });
        if (!notification) throw new Error("Notification not found");
        if (notification.user_id !== (session_user.role === 'USER' ? session_user.user_id : session_user.doctor_id)) {
            throw new Error("You are not authorized to mark this notification as read");
        }

        await notification.update({ seen: true });

        return res.response({
            success: true,
            message: "Notification marked as read"
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(500);
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");

        await Notifications.update({ seen: true }, { where: { user_id: session_user.role == "USER" ? session_user.user_id : session_user.doctor_id, role: session_user.role } });

        return res.response({
            success: true,
            message: "All notifications marked as read"
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(500);
    }
};

const deleteNotification = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error("Session expired");
        const { notification_id } = req.params;
        const notification = await Notifications.findOne({ where: { id: notification_id, role: session_user.role } });

        if (!notification) throw new Error("Notification not found");
        if (notification.user_id !== (session_user.role === 'USER' ? session_user.user_id : session_user.doctor_id)) {
            throw new Error("You are not authorized to delete this notification");
        }

        await notification.destroy();

        return res.response({
            success: true,
            message: "Notification deleted"
        }).code(200);
    } catch (err) {
        console.error(err);
        return res.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(500);
    }
};


module.exports = { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification };