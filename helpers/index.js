const SENSITIVE_FIELDS = ['access_token', 'refresh_token', 'otp_id'];

const stripSensitive = (data) => {
    if (!data) return data;
    if (Array.isArray(data)) return data.map(item => stripSensitive(item));
    if (typeof data === 'object' && data !== null) {
        const cleaned = { ...data };
        SENSITIVE_FIELDS.forEach(field => delete cleaned[field]);
        return cleaned;
    }
    return data;
};

module.exports = {
    HashFunctions: require('./hash_functions'),
    JWTFunctions: require('./jwt_functions'),
    MailFunctions: require('./mail_functions'),
    EncryptFunction: require('./encryption'),
    FileFunctions: require('./file_functions'),
    OTPFunctions: require('./otp'),
    TwilioFunctions: require('./twilio'),
    GoogleAuthFunctions: require('./google_auth'),
    RazorpayFunctions: require('./razorpay'),
    AgoraFunctions: require('./agora'),
    PushNotificationFunctions: require('./pushNotification'),
    NotificationHelper: require('./notification_helper'),
    stripSensitive,
}