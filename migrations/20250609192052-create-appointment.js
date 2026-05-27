'use strict';
const {
  tables: {
    Appointments
  }
} = require('../config')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(Appointments, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      doctor_id: {
        type: Sequelize.INTEGER
      },
      patient_id: {
        type: Sequelize.INTEGER
      },
      appointment_date: {
        type: Sequelize.STRING
      },
      appointment_time: {
        type: Sequelize.STRING
      },
      reason: {
        type: Sequelize.STRING
      },
payment_status: {
        type: Sequelize.STRING
      },
      payment_id: {
        type: Sequelize.STRING
      },
      order_id: {
        type: Sequelize.STRING
      },
      payment_signature: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.STRING
      },
      cancel_reason: {
        type: Sequelize.STRING
      },
      cancel_by: {
        type: Sequelize.STRING
      },
      consultation_modes: {
        type: Sequelize.STRING
      },
      consultation_fee: {
        type: Sequelize.FLOAT
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        allowNull: true,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable(Appointments);
  }
};