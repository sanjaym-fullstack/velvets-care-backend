'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('appointments', 'refund_id', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'payment_signature'
    });
    await queryInterface.addColumn('appointments', 'refund_amount', {
      type: Sequelize.FLOAT,
      allowNull: true,
      after: 'refund_id'
    });
    await queryInterface.addColumn('appointments', 'refund_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null,
      after: 'refund_amount'
    });
    await queryInterface.addColumn('appointments', 'refund_date', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'refund_status'
    });
    await queryInterface.addColumn('appointments', 'refund_reason', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'refund_date'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('appointments', 'refund_id');
    await queryInterface.removeColumn('appointments', 'refund_amount');
    await queryInterface.removeColumn('appointments', 'refund_status');
    await queryInterface.removeColumn('appointments', 'refund_date');
    await queryInterface.removeColumn('appointments', 'refund_reason');
  }
};
