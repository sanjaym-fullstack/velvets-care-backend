'use strict';

const { WebhookController } = require('../controllers');

const tags = ["api", "Webhook"];

module.exports = [
    {
        method: 'POST',
        path: '/webhook/razorpay',
        options: {
            description: 'Razorpay webhook for refund/payment events',
            tags,
            // NO auth — Razorpay calls this directly
            // Razorpay sends raw body with X-Razorpay-Signature header
            payload: {
                parse: false, // Keep raw body for signature verification
                allow: 'application/json',
                output: 'data',
            },
        },
        handler: WebhookController.handleRazorpayWebhook,
    },
];
