'use strict';

const { tables } = require('../config');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Appointments);
    if (!tableInfo.consultation_fee) {
      await queryInterface.addColumn(tables.Appointments, 'consultation_fee', {
        type: Sequelize.FLOAT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Appointments);
    if (tableInfo.consultation_fee) {
      await queryInterface.removeColumn(tables.Appointments, 'consultation_fee');
    }
  }
};
