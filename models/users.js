'use strict';
const {
  Model,
  DataTypes
} = require('sequelize');
const {
  tables: {
    Users
  },
  sequelize
} = require('../config')
const OTPS = require('./otp')
const Files = require('./files')

class UsersModel extends Model { }
UsersModel.init({
  name: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  dob: DataTypes.STRING,
  gender: DataTypes.STRING,
  otp_id: DataTypes.INTEGER,
  access_token: DataTypes.STRING,
  refresh_token: DataTypes.STRING,
  profile_image_id: DataTypes.INTEGER,
  fcm_token: DataTypes.TEXT,
  inactive: DataTypes.BOOLEAN,
  inactive_reason: DataTypes.STRING,
  inactive_till: DataTypes.DATE,
}, {
  sequelize,
  paranoid: true,
  modelName: Users,
});

// associations can be defined here
UsersModel.belongsTo(OTPS, { foreignKey: 'otp_id' });
OTPS.hasMany(UsersModel, { foreignKey: 'otp_id' });

UsersModel.belongsTo(Files, { foreignKey: 'profile_image_id' });
Files.hasMany(UsersModel, { foreignKey: 'profile_image_id' });

module.exports = UsersModel;