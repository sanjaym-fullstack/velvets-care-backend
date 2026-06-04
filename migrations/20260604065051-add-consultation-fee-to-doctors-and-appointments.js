'use strict';

const { tables } = require('../config');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable(tables.Doctors);
      if (!tableInfo.consultation_fee) {
        await queryInterface.addColumn(tables.Doctors, 'consultation_fee', {
          type: Sequelize.FLOAT,
          allowNull: true
        }, { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable(tables.Doctors);
      if (tableInfo.consultation_fee) {
        await queryInterface.removeColumn(tables.Doctors, 'consultation_fee', { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
