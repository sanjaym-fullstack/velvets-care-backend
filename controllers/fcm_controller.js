const { Users, Doctors } = require('../models');
const { PushNotificationFunctions } = require('../helpers');

const saveFcmToken = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        const { fcm_token } = req.payload;

  if (!fcm_token) return res.response({ success: false, message: 'Token required' }).code(400);

  if (session_user.user_id) {
    await Users.update({ fcm_token }, { where: { id: session_user.user_id } });
  } else if (session_user.doctor_id) {
    await Doctors.update({ fcm_token }, { where: { id: session_user.doctor_id } });
  }

  return res.response({ success: true, message: 'Token saved' }).code(200);
} catch (error) {
  console.error('Error saving FCM token:', error);
  return res.response({ success: false, message: error.message || 'Something went wrong' }).code(500);
}
};

const testNotification = async (req, h) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) {
            throw new Error('Session expired');
        }
        
        const { fcm_token, title, body } = req.payload;

        const result = await PushNotificationFunctions.pushNotification.send(
            fcm_token,
            title || 'Test Notification',
            body || 'FCM push is working successfully 🚀'
        );

        return h.response({
            success: true,
            result
        }).code(200);

    } catch (err) {
        console.error('Error sending test notification:', err);
        return h.response({
            success: false,
            message: err.message || 'Something went wrong'
        }).code(500);
    }
};
module.exports = {
  saveFcmToken,
    testNotification
};