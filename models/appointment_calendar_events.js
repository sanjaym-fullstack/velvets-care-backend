'use strict';
const {
  tables: {
    AppointmentCalendarEvents
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const Appointments = require('./appointment');

class AppointmentCalendarEvent extends Model {
}

AppointmentCalendarEvent.init({
  appointment_id: DataTypes.INTEGER,
  role: { type: DataTypes.ENUM('doctor', 'patient'), allowNull: false },
  user_id: DataTypes.INTEGER,
  doctor_id: DataTypes.INTEGER,
  google_event_id: DataTypes.STRING,
  calendar_id: { type: DataTypes.STRING, defaultValue: 'primary' }
}, {
  sequelize,
  modelName: AppointmentCalendarEvents,
  tableName: AppointmentCalendarEvents,
});

AppointmentCalendarEvent.belongsTo(Appointments, { foreignKey: 'appointment_id' });
Appointments.hasMany(AppointmentCalendarEvent, { foreignKey: 'appointment_id' });

module.exports = AppointmentCalendarEvent;
