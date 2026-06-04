'use strict';
const {
  tables: {
    PayoutSettings
  }
} = require('../config')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(PayoutSettings, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      label: {
        type: Sequelize.STRING,
        allowNull: false
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      type: {
        type: Sequelize.STRING,
        defaultValue: 'percentage'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(PayoutSettings);
  }
};
