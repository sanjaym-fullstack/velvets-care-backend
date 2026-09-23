'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('google_calendar_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      doctor_id: { type: Sequelize.INTEGER, allowNull: true },
      role: { type: Sequelize.ENUM('doctor', 'patient'), allowNull: false },
      access_token: { type: Sequelize.TEXT, allowNull: true },
      refresh_token: { type: Sequelize.TEXT, allowNull: true },
      token_expiry: { type: Sequelize.DATE, allowNull: true },
      calendar_id: { type: Sequelize.STRING, defaultValue: 'primary' },
      google_email: { type: Sequelize.STRING, allowNull: true },
      linked: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.createTable('appointment_calendar_events', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      appointment_id: { type: Sequelize.INTEGER, allowNull: false },
      role: { type: Sequelize.ENUM('doctor', 'patient'), allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      doctor_id: { type: Sequelize.INTEGER, allowNull: true },
      google_event_id: { type: Sequelize.STRING, allowNull: false },
      calendar_id: { type: Sequelize.STRING, defaultValue: 'primary' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('google_calendar_tokens', ['role', 'doctor_id']);
    await queryInterface.addIndex('google_calendar_tokens', ['role', 'user_id']);
    await queryInterface.addIndex('appointment_calendar_events', ['appointment_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('appointment_calendar_events');
    await queryInterface.dropTable('google_calendar_tokens');
  }
};
