'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const {
  tables: {
    Notifications: Notification
  },
  sequelize
} = require('../config');

const userModel = require('./users');


class Notifications extends Model { }
Notifications.init({
  user_id: DataTypes.INTEGER,
  role: DataTypes.STRING,
  message: DataTypes.STRING,
  seen: DataTypes.BOOLEAN
}, {
  sequelize,
  modelName: Notification,
  tableName: Notification,
  paranoid: true
});


userModel.hasMany(Notifications, { foreignKey: 'user_id' });
Notifications.belongsTo(userModel, { foreignKey: 'user_id' });


module.exports = Notifications;