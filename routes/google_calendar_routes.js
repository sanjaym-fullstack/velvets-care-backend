'use strict';
const {
    GoogleCalendarController: {
        getAuthUrl,
        handleCallback,
        getStatus,
        unlink
    }
} = require('../controllers');

const BASE = '/api/v1/google-calendar';

module.exports = [
    {
        method: 'GET',
        path: `${BASE}/auth-url`,
        options: {
            handler: getAuthUrl,
            description: 'Get Google Calendar OAuth URL for linking',
            tags: ['api', 'Google Calendar'],
            notes: 'Returns a URL the user must visit to authorize Google Calendar access',
            auth: false,
            validate: {
                query: require('joi').object({
                    role: require('joi').string().valid('doctor', 'patient').required()
                })
            }
        }
    },
    {
        method: 'GET',
        path: `${BASE}/callback`,
        options: {
            handler: handleCallback,
            description: 'Google Calendar OAuth callback',
            tags: ['api', 'Google Calendar'],
            notes: 'Google redirects here after user authorizes. Stores tokens and links calendar.',
            auth: false
        }
    },
    {
        method: 'GET',
        path: `${BASE}/status`,
        options: {
            handler: getStatus,
            description: 'Get Google Calendar linking status',
            tags: ['api', 'Google Calendar'],
            notes: 'Returns whether the user has linked their Google Calendar',
            auth: false,
            validate: {
                query: require('joi').object({
                    role: require('joi').string().valid('doctor', 'patient').required()
                })
            }
        }
    },
    {
        method: 'POST',
        path: `${BASE}/unlink`,
        options: {
            handler: unlink,
            description: 'Unlink Google Calendar and delete all calendar events',
            tags: ['api', 'Google Calendar'],
            validate: {
                payload: require('joi').object({
                    role: require('joi').string().valid('doctor', 'patient').required()
                })
            }
        }
    }
];
