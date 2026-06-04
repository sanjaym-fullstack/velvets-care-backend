'use strict';

const { tables } = require('../config');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Doctors);
    if (!tableInfo.consultation_fee) {
      await queryInterface.addColumn(tables.Doctors, 'consultation_fee', {
        type: Sequelize.FLOAT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Doctors);
    if (tableInfo.consultation_fee) {
      await queryInterface.removeColumn(tables.Doctors, 'consultation_fee');
    }
  }
};
