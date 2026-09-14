'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('doctors', 'is_popular', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      after: 'fcm_token'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('doctors', 'is_popular');
  }
};
