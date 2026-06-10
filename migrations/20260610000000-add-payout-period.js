'use strict';
const {
  tables: {
    Payouts
  }
} = require('../config')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(Payouts, 'from_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn(Payouts, 'to_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(Payouts, 'from_date');
    await queryInterface.removeColumn(Payouts, 'to_date');
  }
};
