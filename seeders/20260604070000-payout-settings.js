'use strict';
const {
  tables: {
    PayoutSettings
  },
  sequelize
} = require('../config')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(PayoutSettings, [
      {
        key: 'platform_fee_percentage',
        label: 'Platform Fee (%)',
        value: 10,
        type: 'percentage',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'gst_percentage',
        label: 'GST on Platform Fee (%)',
        value: 18,
        type: 'percentage',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'minimum_payout_amount',
        label: 'Minimum Payout Amount (Rs)',
        value: 100,
        type: 'fixed',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        key: 'payout_mode',
        label: 'Payout Mode (IMPS/NEFT/RTGS)',
        value: 0,
        type: 'string',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(PayoutSettings, {
      key: ['platform_fee_percentage', 'gst_percentage', 'minimum_payout_amount', 'payout_mode']
    }, {});
  }
};
