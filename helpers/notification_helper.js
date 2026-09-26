const { Users, Doctors, Notifications } = require('../models');
const { Op } = require('sequelize');
const { pushNotification } = require('./pushNotification');

// Dedup guard: prevent sending same notification to same user within 30 seconds
const recentNotifications = new Map();
const DEDUP_WINDOW_MS = 30000;

function getDedupeKey(userId, title, body) {
  return `${userId}:${title}:${body}`;
}

function isDuplicate(key) {
  const now = Date.now();
  const lastSent = recentNotifications.get(key);
  if (lastSent && (now - lastSent) < DEDUP_WINDOW_MS) {
    return true;
  }
  recentNotifications.set(key, now);
  // Cleanup old entries every 100 calls
  if (recentNotifications.size > 500) {
    for (const [k, v] of recentNotifications) {
      if (now - v > DEDUP_WINDOW_MS) recentNotifications.delete(k);
    }
  }
  return false;
}

const sendToUser = async (userId, title, body, extras = {}) => {
  const key = getDedupeKey(userId, title, body);
  if (isDuplicate(key)) {
    console.log(`Notification deduped: "${title}" to user ${userId}`);
    return;
  }
  const user = await Users.findByPk(userId);
  if (user?.fcm_token) {
    await Notifications.create({
      user_id: userId,
      role: 'USER',
      message: body,
      seen: false
    });
    return pushNotification.send(user.fcm_token, title, body, null, null, extras, userId);
  }
};

const sendToDoctor = async (doctorId, title, body, extras = {}) => {
  const key = getDedupeKey(doctorId, title, body);
  if (isDuplicate(key)) {
    console.log(`Notification deduped: "${title}" to doctor ${doctorId}`);
    return;
  }
  const doctor = await Doctors.findByPk(doctorId);
  if (doctor?.fcm_token) {
    await Notifications.create({
      user_id: doctorId,
      role: 'DOCTOR',
      message: body,
      seen: false
    });
    return pushNotification.send(doctor.fcm_token, title, body, null, null, extras, doctorId);
  }
};

const sendToAllUsers = async (title, body, extras = {}) => {
  const users = await Users.findAll({ where: { fcm_token: { [Op.ne]: null } } });
  await Notifications.bulkCreate(users.map(u => ({
    user_id: u.id,
    role: 'USER',
    message: body,
    seen: false
  })));
  return Promise.allSettled(users.map(u => {
    const key = getDedupeKey(u.id, title, body);
    if (isDuplicate(key)) return { status: 'skipped', reason: 'dedup' };
    return pushNotification.send(u.fcm_token, title, body, null, null, extras, u.id);
  }));
};

const sendToAllDoctors = async (title, body, extras = {}) => {
  const doctors = await Doctors.findAll({ where: { fcm_token: { [Op.ne]: null } } });
  await Notifications.bulkCreate(doctors.map(d => ({
    user_id: d.id,
    role: 'DOCTOR',
    message: body,
    seen: false
  })));
  return Promise.allSettled(doctors.map(d => {
    const key = getDedupeKey(d.id, title, body);
    if (isDuplicate(key)) return { status: 'skipped', reason: 'dedup' };
    return pushNotification.send(d.fcm_token, title, body, null, null, extras, d.id);
  }));
};

const sendToAllAdmins = async (title, body, extras = {}) => {
  const admins = await Users.findAll({ where: { fcm_token: { [Op.ne]: null }, is_admin: true } });
  await Notifications.bulkCreate(admins.map(a => ({
    user_id: a.id,
    role: 'ADMIN',
    message: body,
    seen: false
  })));
  return Promise.allSettled(admins.map(a => {
    const key = getDedupeKey(a.id, title, body);
    if (isDuplicate(key)) return { status: 'skipped', reason: 'dedup' };
    return pushNotification.send(a.fcm_token, title, body, null, null, extras, a.id);
  }));
};

module.exports = { sendToUser, sendToDoctor, sendToAllUsers, sendToAllDoctors, sendToAllAdmins };
