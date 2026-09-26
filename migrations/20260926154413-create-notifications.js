'use strict';
/** @type {import('sequelize-cli').Migration} */

const {
  tables: {
    Notifications
  },
  sequelize
} = require('../config');


module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(Notifications, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER
      },
      role: {
        type: Sequelize.STRING
      },
      message: {
        type: Sequelize.STRING
      },
      seen: {
        type: Sequelize.BOOLEAN
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
    await queryInterface.dropTable(Notifications);
  }
};