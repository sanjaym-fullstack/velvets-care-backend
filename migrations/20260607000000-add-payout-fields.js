'use strict';
const {
  tables: {
    Payouts
  }
} = require('../config')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(Payouts, 'payout_type', {
      type: Sequelize.STRING,
      defaultValue: 'automatic'
    });
    await queryInterface.addColumn(Payouts, 'comment', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn(Payouts, 'transaction_id', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn(Payouts, 'processed_by', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(Payouts, 'payout_type');
    await queryInterface.removeColumn(Payouts, 'comment');
    await queryInterface.removeColumn(Payouts, 'transaction_id');
    await queryInterface.removeColumn(Payouts, 'processed_by');
  }
};
