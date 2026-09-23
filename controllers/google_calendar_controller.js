'use strict';
const { GoogleCalendarHelper } = require('../helpers');

const getAuthUrl = async (req, res) => {
    try {
        if (!GoogleCalendarHelper.isConfigured()) {
            return res.response({ success: false, message: 'Google Calendar not configured on server' }).code(200);
        }

        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { role } = req.query;
        if (!role || !['doctor', 'patient'].includes(role)) {
            throw new Error('role must be "doctor" or "patient"');
        }

        if (role === 'doctor' && !session_user.doctor_id) {
            throw new Error('Doctor ID required');
        }

        const userId = role === 'patient' ? session_user.user_id : null;
        const doctorId = role === 'doctor' ? session_user.doctor_id : null;

        const url = GoogleCalendarHelper.getAuthUrl(role, userId, doctorId);

        return res.response({ success: true, data: { url } }).code(200);
    } catch (err) {
        console.log(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

const handleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        if (!code || !state) throw new Error('Missing code or state parameter');

        const result = await GoogleCalendarHelper.handleCallback(code, state);

        const frontendUrl = process.env.GOOGLE_CALENDAR_REDIRECT_URI
            ? process.env.GOOGLE_CALENDAR_REDIRECT_URI.replace(/\/api\/v1.*/, '')
            : 'https://velvetscare.com';

        return res.response(
            `<html><body style="font-family:sans-serif;text-align:center;padding:50px">
                <h2>Google Calendar Linked Successfully!</h2>
                <p>Calendar: ${result.email}</p>
                <p>You can close this window.</p>
                <script>window.close();</script>
            </body></html>`
        ).code(200);
    } catch (err) {
        console.log(err);
        return res.response(
            `<html><body style="font-family:sans-serif;text-align:center;padding:50px">
                <h2>Failed to link Google Calendar</h2>
                <p>${err.message}</p>
            </body></html>`
        ).code(200);
    }
};

const getStatus = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { role } = req.query;
        if (!role || !['doctor', 'patient'].includes(role)) {
            throw new Error('role must be "doctor" or "patient"');
        }

        const userId = role === 'patient' ? session_user.user_id : null;
        const doctorId = role === 'doctor' ? session_user.doctor_id : null;

        const status = await GoogleCalendarHelper.getCalendarStatus(role, userId, doctorId);
        status.configured = GoogleCalendarHelper.isConfigured();

        return res.response({ success: true, data: status }).code(200);
    } catch (err) {
        console.log(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

const unlink = async (req, res) => {
    try {
        const session_user = req.headers.user;
        if (!session_user) throw new Error('Session expired');

        const { role } = req.payload;
        if (!role || !['doctor', 'patient'].includes(role)) {
            throw new Error('role must be "doctor" or "patient"');
        }

        const userId = role === 'patient' ? session_user.user_id : null;
        const doctorId = role === 'doctor' ? session_user.doctor_id : null;

        const removed = await GoogleCalendarHelper.unlinkCalendar(role, userId, doctorId);
        if (!removed) throw new Error('No linked calendar found');

        return res.response({ success: true, message: 'Google Calendar unlinked successfully' }).code(200);
    } catch (err) {
        console.log(err);
        return res.response({ success: false, message: err.message || 'Something went wrong' }).code(200);
    }
};

module.exports = {
    getAuthUrl,
    handleCallback,
    getStatus,
    unlink
};
