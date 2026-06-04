'use strict';
const {
  tables: {
    DoctorBankAccounts
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const Doctors = require('./doctors');

class DoctorBankAccount extends Model {
}

DoctorBankAccount.init({
  doctor_id: DataTypes.INTEGER,
  account_holder_name: DataTypes.STRING,
  account_number: DataTypes.STRING,
  ifsc_code: DataTypes.STRING,
  bank_name: DataTypes.STRING,
  branch_name: DataTypes.STRING,
  razorpay_contact_id: DataTypes.STRING,
  razorpay_fund_account_id: DataTypes.STRING
}, {
  sequelize,
  modelName: DoctorBankAccounts,
  tableName: DoctorBankAccounts,
});

DoctorBankAccount.belongsTo(Doctors, { foreignKey: 'doctor_id' });
Doctors.hasOne(DoctorBankAccount, { foreignKey: 'doctor_id' });

module.exports = DoctorBankAccount
