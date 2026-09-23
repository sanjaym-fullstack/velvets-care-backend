'use strict';
const { google } = require('googleapis');
const { env } = require('../config');
const { GoogleCalendarTokens, AppointmentCalendarEvents } = require('../models');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getOAuth2Client() {
    return new google.auth.OAuth2(
        env.GOOGLE_CALENDAR_CLIENT_ID,
        env.GOOGLE_CALENDAR_CLIENT_SECRET,
        env.GOOGLE_CALENDAR_REDIRECT_URI
    );
}

function isConfigured() {
    return !!(env.GOOGLE_CALENDAR_CLIENT_ID && env.GOOGLE_CALENDAR_CLIENT_SECRET && env.GOOGLE_CALENDAR_REDIRECT_URI);
}

function getAuthUrl(role, userId, doctorId) {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
        state: JSON.stringify({ role, user_id: userId, doctor_id: doctorId })
    });
}

async function handleCallback(code, stateStr) {
    const state = JSON.parse(stateStr);
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const about = await calendar.about.get();

    const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date),
        google_email: about.data.user.emailAddress,
        linked: true,
        calendar_id: 'primary',
        role: state.role,
        user_id: state.role === 'patient' ? state.user_id : null,
        doctor_id: state.role === 'doctor' ? state.doctor_id : null
    };

    const whereClause = { role: state.role, linked: true };
    if (state.role === 'doctor') whereClause.doctor_id = state.doctor_id;
    else whereClause.user_id = state.user_id;

    const [record, created] = await GoogleCalendarTokens.findOrCreate({
        where: whereClause,
        defaults: tokenData
    });

    if (!created) {
        await record.update(tokenData);
    }

    return { email: tokenData.google_email, linked: true };
}

async function getAuthenticatedClient(role, userId, doctorId) {
    const whereClause = { linked: true, role };
    if (role === 'doctor') whereClause.doctor_id = doctorId;
    else whereClause.user_id = userId;

    const tokenRecord = await GoogleCalendarTokens.findOne({ where: whereClause });
    if (!tokenRecord) return null;

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: tokenRecord.access_token,
        refresh_token: tokenRecord.refresh_token,
        expiry_date: tokenRecord.token_expiry ? tokenRecord.token_expiry.getTime() : undefined
    });

    oauth2Client.on('tokens', async (tokens) => {
        const updateData = {};
        if (tokens.access_token) updateData.access_token = tokens.access_token;
        if (tokens.expiry_date) updateData.token_expiry = new Date(tokens.expiry_date);
        if (Object.keys(updateData).length > 0) {
            await tokenRecord.update(updateData);
        }
    });

    return oauth2Client;
}

async function createCalendarEvent(appointment, doctor, patient) {
    if (!isConfigured()) return null;

    const results = [];

    const dateStr = appointment.appointment_date;
    const timeStr = appointment.appointment_time;

    let startDate, endDate;
    try {
        const dateTime = buildEventDateTime(dateStr, timeStr);
        startDate = dateTime.start;
        endDate = dateTime.end;
    } catch (e) {
        console.error('Google Calendar: Failed to parse date/time', e.message);
        return null;
    }

    const summary = `Appointment with Dr. ${doctor.full_name}`;
    const description = [
        `Patient: ${patient?.name || 'Unknown'}`,
        `Doctor: Dr. ${doctor.full_name}`,
        `Time: ${appointment.appointment_time}`,
        `Reason: ${appointment.reason || 'N/A'}`,
        `Mode: ${appointment.consultation_modes || 'N/A'}`,
        `Fee: ₹${appointment.consultation_fee}`,
        `Appointment ID: ${appointment.id}`
    ].join('\n');

    const doctorClient = await getAuthenticatedClient('doctor', null, doctor.id);
    if (doctorClient) {
        try {
            const event = await createEvent(doctorClient, summary, description, startDate, endDate);
            const calEvent = await AppointmentCalendarEvent.create({
                appointment_id: appointment.id,
                role: 'doctor',
                doctor_id: doctor.id,
                user_id: null,
                google_event_id: event.id,
                calendar_id: 'primary'
            });
            results.push({ role: 'doctor', event_id: event.id, id: calEvent.id });
        } catch (e) {
            console.error('Google Calendar: Failed to create doctor event', e.message);
        }
    }

    const patientClient = await getAuthenticatedClient('patient', patient?.id, null);
    if (patientClient) {
        try {
            const event = await createEvent(patientClient, summary, description, startDate, endDate);
            const calEvent = await AppointmentCalendarEvent.create({
                appointment_id: appointment.id,
                role: 'patient',
                doctor_id: null,
                user_id: patient?.id,
                google_event_id: event.id,
                calendar_id: 'primary'
            });
            results.push({ role: 'patient', event_id: event.id, id: calEvent.id });
        } catch (e) {
            console.error('Google Calendar: Failed to create patient event', e.message);
        }
    }

    return results.length > 0 ? results : null;
}

async function deleteCalendarEvents(appointmentId) {
    if (!isConfigured()) return;

    const events = await AppointmentCalendarEvents.findAll({
        where: { appointment_id: appointmentId }
    });

    for (const eventRecord of events) {
        const client = await getAuthenticatedClient(
            eventRecord.role,
            eventRecord.user_id,
            eventRecord.doctor_id
        );
        if (client) {
            try {
                const calendar = google.calendar({ version: 'v3', auth: client });
                await calendar.events.delete({
                    calendarId: eventRecord.calendar_id || 'primary',
                    eventId: eventRecord.google_event_id
                });
            } catch (e) {
                console.error(`Google Calendar: Failed to delete event ${eventRecord.google_event_id}`, e.message);
            }
        }
        await eventRecord.destroy();
    }
}

async function unlinkCalendar(role, userId, doctorId) {
    const whereClause = { role, linked: true };
    if (role === 'doctor') whereClause.doctor_id = doctorId;
    else whereClause.user_id = userId;

    const record = await GoogleCalendarTokens.findOne({ where: whereClause });
    if (!record) return false;

    const events = await AppointmentCalendarEvents.findAll({
        where: role === 'doctor'
            ? { doctor_id: doctorId, role: 'doctor' }
            : { user_id: userId, role: 'patient' }
    });

    for (const ev of events) {
        const client = await getAuthenticatedClient(role, userId, doctorId);
        if (client) {
            try {
                const calendar = google.calendar({ version: 'v3', auth: client });
                await calendar.events.delete({
                    calendarId: ev.calendar_id || 'primary',
                    eventId: ev.google_event_id
                });
            } catch (e) { /* ignore */ }
        }
        await ev.destroy();
    }

    await record.destroy();
    return true;
}

async function getCalendarStatus(role, userId, doctorId) {
    const whereClause = { role, linked: true };
    if (role === 'doctor') whereClause.doctor_id = doctorId;
    else whereClause.user_id = userId;

    const record = await GoogleCalendarTokens.findOne({ where: whereClause, attributes: ['google_email', 'linked', 'updatedAt'] });
    return record ? { linked: true, email: record.google_email, linked_at: record.updatedAt } : { linked: false };
}

async function createEvent(oauth2Client, summary, description, startDateTime, endDateTime) {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
        summary,
        description,
        start: { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Kolkata' },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 60 },
                { method: 'popup', minutes: 15 }
            ]
        }
    };

    const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event
    });

    return response.data;
}

function buildEventDateTime(dateStr, timeStr) {
    const parsed = parseDateTime(dateStr, timeStr);
    if (!parsed) throw new Error(`Cannot parse date/time: ${dateStr} ${timeStr}`);
    const start = parsed.toISOString();
    const end = new Date(parsed.getTime() + 30 * 60000).toISOString();
    return { start, end };
}

function parseDateTime(dateStr, timeStr) {
    let datePart = dateStr;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parseInt(parts[0]) > 12) {
            datePart = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
            datePart = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
    } else if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
        const parts = dateStr.split('-');
        if (parseInt(parts[0]) > 12) {
            const [day, month, year] = parts;
            datePart = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
            const [month, day, year] = parts;
            datePart = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }

    let hours = 0, minutes = 0;
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        const modifier = timeMatch[3];
        if (modifier) {
            const upper = modifier.toUpperCase();
            if (upper === 'PM' && hours !== 12) hours += 12;
            if (upper === 'AM' && hours === 12) hours = 0;
        }
    }

    const iso = `${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    return new Date(iso);
}

module.exports = {
    isConfigured,
    getAuthUrl,
    handleCallback,
    createCalendarEvent,
    deleteCalendarEvents,
    unlinkCalendar,
    getCalendarStatus,
    buildEventDateTime
};
