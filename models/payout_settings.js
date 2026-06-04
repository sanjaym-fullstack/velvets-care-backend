'use strict';
const {
  tables: {
    PayoutSettings
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');

class PayoutSetting extends Model {
}

PayoutSetting.init({
  key: DataTypes.STRING,
  label: DataTypes.STRING,
  value: DataTypes.FLOAT,
  type: DataTypes.STRING
}, {
  sequelize,
  modelName: PayoutSettings,
  tableName: PayoutSettings,
});

module.exports = PayoutSetting
