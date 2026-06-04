'use strict';
const {
  tables: {
    Payouts
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const Doctors = require('./doctors');

class Payout extends Model {
}

Payout.init({
  doctor_id: DataTypes.INTEGER,
  total_earnings: DataTypes.FLOAT,
  platform_fee_percentage: DataTypes.FLOAT,
  platform_fee_amount: DataTypes.FLOAT,
  gst_percentage: DataTypes.FLOAT,
  gst_amount: DataTypes.FLOAT,
  total_deductions: DataTypes.FLOAT,
  net_payout: DataTypes.FLOAT,
  status: DataTypes.STRING,
  razorpay_payout_id: DataTypes.STRING,
  utr: DataTypes.STRING,
  processed_at: DataTypes.DATE
}, {
  sequelize,
  modelName: Payouts,
  tableName: Payouts,
});

Payout.belongsTo(Doctors, { foreignKey: 'doctor_id' });
Doctors.hasMany(Payout, { foreignKey: 'doctor_id' });

module.exports = Payout
