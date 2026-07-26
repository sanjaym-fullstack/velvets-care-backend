'use strict';
const {
  tables: {
    Users
  }
} = require('../config')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(Users, 'inactive', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn(Users, 'inactive_reason', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn(Users, 'inactive_till', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(Users, 'inactive');
    await queryInterface.removeColumn(Users, 'inactive_reason');
    await queryInterface.removeColumn(Users, 'inactive_till');
  }
};
