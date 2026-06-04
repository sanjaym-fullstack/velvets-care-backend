'use strict';
const {
  tables: {
    Payouts
  }
} = require('../config')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(Payouts, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      doctor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'doctors',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      total_earnings: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      platform_fee_percentage: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      platform_fee_amount: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      gst_percentage: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      gst_amount: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      total_deductions: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      net_payout: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'pending'
      },
      razorpay_payout_id: {
        type: Sequelize.STRING
      },
      utr: {
        type: Sequelize.STRING
      },
      processed_at: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable(Payouts);
  }
};
