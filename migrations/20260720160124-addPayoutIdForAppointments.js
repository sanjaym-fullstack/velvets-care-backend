'use strict';
const {
  tables: {
    Appointments
  }
} = require('../config')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(Appointments, 'payout_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn(Appointments, 'payout_processed', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(Appointments, 'payout_id');
    await queryInterface.removeColumn(Appointments, 'payout_processed');
  }
};
