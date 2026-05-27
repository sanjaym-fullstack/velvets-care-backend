'use strict';
const {
  tables: {
    Appointments
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const Users  =require ('../models/users')
const doctors  =require ('../models/doctors')
  class Appointment extends Model {
  }
  Appointment.init({
    doctor_id: DataTypes.INTEGER,
    patient_id: DataTypes.INTEGER,
    appointment_date: DataTypes.STRING,
    appointment_time: DataTypes.STRING,
    reason: DataTypes.STRING,
    status: DataTypes.STRING,
    payment_status: DataTypes.STRING,
    payment_id: DataTypes.STRING,
    order_id: DataTypes.STRING,
    payment_signature: DataTypes.TEXT,
    cancel_reason: DataTypes.STRING,
    consultation_modes: DataTypes.STRING,
    cancel_by: DataTypes.STRING,
    consultation_fee: DataTypes.FLOAT
  }, {
    sequelize,
    paranoid: true,
    modelName: Appointments,
    tableName: Appointments,
  });
  

  Appointment.belongsTo(Users, { foreignKey: 'patient_id' });
  Users.hasMany(Appointment, { foreignKey: 'patient_id' });

  Appointment.belongsTo(doctors, { foreignKey: 'doctor_id' });
  doctors.hasMany(Appointment, { foreignKey: 'doctor_id' });

  module.exports = Appointment