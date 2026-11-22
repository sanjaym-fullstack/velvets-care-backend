'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const {
  tables: {
    Accounts
  },
  sequelize
} = require('../config')

// Central phone registry: exactly one row per phone number across the
// whole system. users.account_id and doctors.account_id point here, so a
// number can never belong to both roles.
class AccountsModel extends Model { }
AccountsModel.init({
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  sequelize,
  modelName: Accounts,
  tableName: Accounts,
});

module.exports = AccountsModel;
