'use strict';

const { tables } = require('../config');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Adresses);
    if (!tableInfo.user_id) {
      await queryInterface.addColumn(tables.Adresses, 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(tables.Adresses);
    if (tableInfo.user_id) {
      await queryInterface.removeColumn(tables.Adresses, 'user_id');
    }
  }
};
