'use strict';
const Joi = require('joi');
const {
    TransactionController: {
        getAdminTransactions,
        getUserTransactions,
        getDoctorTransactions,
        getTransactionSummary
    }
} = require('../controllers');

const BASE = '/api/v1';

const commonQuerySchema = {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    date_from: Joi.string().optional().allow('').description('Start date (YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY)'),
    date_to: Joi.string().optional().allow('').description('End date (YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY)'),
    payment_status: Joi.string().optional().allow('').description('Filter by payment status'),
    search: Joi.string().optional().allow('').description('Search by name, payment ID, transaction ID'),
    sort_by: Joi.string().valid('date', 'amount').default('date'),
    sort_order: Joi.string().valid('ASC', 'DESC').default('DESC')
};

module.exports = [
    // ── Admin Transactions ──
    {
        method: 'GET',
        path: `${BASE}/admin/transactions`,
        options: {
            handler: getAdminTransactions,
            description: 'Get all transactions (appointments + orders + payouts + refunds)',
            tags: ['api', 'Transactions'],
            notes: 'Admin can view all transactions with date range, type, status, and search filters',
            validate: {
                query: Joi.object({
                    ...commonQuerySchema,
                    type: Joi.string().valid('appointment', 'order', 'refund', 'payout').optional().allow('').description('Filter by transaction type')
                })
            }
        }
    },
    // ── Admin Transaction Summary ──
    {
        method: 'GET',
        path: `${BASE}/admin/transactions/summary`,
        options: {
            handler: getTransactionSummary,
            description: 'Get transaction summary dashboard for admin',
            tags: ['api', 'Transactions'],
            notes: 'Returns total revenue, refunds, payouts, platform income, and status breakdowns',
            validate: {
                query: Joi.object({
                    date_from: Joi.string().optional().allow(''),
                    date_to: Joi.string().optional().allow('')
                })
            }
        }
    },
    // ── User Transactions ──
    {
        method: 'GET',
        path: `${BASE}/user/transactions`,
        options: {
            handler: getUserTransactions,
            description: 'Get user own transactions (appointments + orders)',
            tags: ['api', 'Transactions'],
            notes: 'User can view their own payment history with date range, type, and search filters',
            validate: {
                query: Joi.object({
                    ...commonQuerySchema,
                    type: Joi.string().valid('appointment', 'order', 'refund').optional().allow('').description('Filter by transaction type')
                })
            }
        }
    },
    // ── Doctor Transactions ──
    {
        method: 'GET',
        path: `${BASE}/doctor/transactions`,
        options: {
            handler: getDoctorTransactions,
            description: 'Get doctor own transactions (consultations + payouts)',
            tags: ['api', 'Transactions'],
            notes: 'Doctor can view their consultation earnings and payout history with date range, type, and search filters',
            validate: {
                query: Joi.object({
                    ...commonQuerySchema,
                    type: Joi.string().valid('consultation', 'payout', 'refund').optional().allow('').description('Filter by transaction type')
                })
            }
        }
    }
];
