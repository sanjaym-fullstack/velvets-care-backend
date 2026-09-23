'use strict';
const {
  tables: {
    GoogleCalendarTokens
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const Doctors = require('./doctors');
const Users = require('./users');

class GoogleCalendarToken extends Model {
}

GoogleCalendarToken.init({
  user_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  role: { type: DataTypes.ENUM('doctor', 'patient'), allowNull: false },
  access_token: DataTypes.TEXT,
  refresh_token: DataTypes.TEXT,
  token_expiry: DataTypes.DATE,
  calendar_id: { type: DataTypes.STRING, defaultValue: 'primary' },
  google_email: DataTypes.STRING,
  linked: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  sequelize,
  modelName: GoogleCalendarTokens,
  tableName: GoogleCalendarTokens,
});

GoogleCalendarToken.belongsTo(Doctors, { foreignKey: 'doctor_id', constraints: false });
GoogleCalendarToken.belongsTo(Users, { foreignKey: 'user_id', constraints: false });

module.exports = GoogleCalendarToken;
