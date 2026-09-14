'use strict';
const{
  tables:{
    Doctors
  },
  sequelize
} = require('../config')
const {
  Model,
  DataTypes
} = require('sequelize');
const OTPS = require('./otp')
const Files = require('./files')
const Specialization = require('./specialization');
  class DoctorModel extends Model {
  }
  DoctorModel.init({
    full_name: DataTypes.STRING,
    gender: DataTypes.STRING,
    date_of_birth: DataTypes.STRING,
    phone: DataTypes.BIGINT,
    email: DataTypes.STRING,
    specialization: DataTypes.STRING,
    specialization_id: DataTypes.INTEGER,
    years_of_experience: DataTypes.INTEGER,
    description: DataTypes.STRING,
    registration_number: DataTypes.STRING,
    registration_certificate_id: DataTypes.INTEGER,
    medical_degree_certificate_id: DataTypes.INTEGER,
    profile_image_id: DataTypes.INTEGER,
    consultation_fee: DataTypes.FLOAT,
    total_earnings: DataTypes.FLOAT,
    consultation_modes: DataTypes.STRING,
    languages_spoken: DataTypes.STRING,
    government_id: DataTypes.INTEGER,
    pan_card_id: DataTypes.INTEGER,
    status: DataTypes.BOOLEAN,
    verified: DataTypes.BOOLEAN,
    otp_id: DataTypes.INTEGER,
    access_token: DataTypes.STRING,
    refresh_token: DataTypes.STRING,
    fcm_token: DataTypes.TEXT,
    is_popular: DataTypes.BOOLEAN,
  }, {
    sequelize,
    paranoid: true,
    modelName: Doctors,
  });
  
  DoctorModel.belongsTo(Files, { foreignKey: 'registration_certificate_id', as: 'registration_certificate' });
  Files.hasMany(DoctorModel, { foreignKey: 'registration_certificate_id', as: 'registration_certificate' });
  
  DoctorModel.belongsTo(Files, { foreignKey: 'medical_degree_certificate_id', as: 'medical_degree_certificate' });
  Files.hasMany(DoctorModel, { foreignKey: 'medical_degree_certificate_id', as: 'medical_degree_certificate' });
  
  DoctorModel.belongsTo(Files, { foreignKey: 'profile_image_id', as: 'profile_image' });
  Files.hasMany(DoctorModel, { foreignKey: 'profile_image_id', as: 'profile_image' });
  
  DoctorModel.belongsTo(Files, { foreignKey: 'government_id', as: 'government_id_file' });
  Files.hasMany(DoctorModel, { foreignKey: 'government_id', as: 'government_id_file' });
  
  DoctorModel.belongsTo(Files, { foreignKey: 'pan_card_id', as: 'pan_card_file' });
  Files.hasMany(DoctorModel, { foreignKey: 'pan_card_id', as: 'pan_card_file' });

  DoctorModel.belongsTo(Specialization, { foreignKey: 'specialization_id'});
  Specialization.hasMany(DoctorModel, { foreignKey: 'specialization_id' });
  
 
  
  module.exports = DoctorModel;