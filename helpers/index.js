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

// Converts consultation_fee to rupees if it was accidentally stored as paise
const normalizeFee = (value) => {
    const num = Number(value) || 0;
    // If value > 50000 paise = ₹500 max reasonable consultation fee in rupees
    // Old records stored paise (e.g., 75000 = ₹750). New records store rupees (e.g., 750)
    if (num > 50000) {
        return Math.round(num / 100);
    }
    return num;
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
    GoogleCalendarHelper: require('./google_calendar'),
    stripSensitive,
    normalizeFee,
}