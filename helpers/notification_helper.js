const { Users, Doctors } = require('../models');
const { Op } = require('sequelize');
const { pushNotification } = require('./pushNotification');

const sendToUser = async (userId, title, body, extras = {}) => {
  const user = await Users.findByPk(userId);
  if (user?.fcm_token) {
    return pushNotification.send(user.fcm_token, title, body, null, null, extras, userId);
  }
};

const sendToDoctor = async (doctorId, title, body, extras = {}) => {
  const doctor = await Doctors.findByPk(doctorId);
  if (doctor?.fcm_token) {
    return pushNotification.send(doctor.fcm_token, title, body, null, null, extras, doctorId);
  }
};

const sendToAllUsers = async (title, body, extras = {}) => {
  const users = await Users.findAll({ where: { fcm_token: { [Op.ne]: null } } });
  return Promise.allSettled(users.map(u =>
    pushNotification.send(u.fcm_token, title, body, null, null, extras, u.id)
  ));
};

const sendToAllDoctors = async (title, body, extras = {}) => {
  const doctors = await Doctors.findAll({ where: { fcm_token: { [Op.ne]: null } } });
  return Promise.allSettled(doctors.map(d =>
    pushNotification.send(d.fcm_token, title, body, null, null, extras, d.id)
  ));
};

module.exports = { sendToUser, sendToDoctor, sendToAllUsers, sendToAllDoctors };
