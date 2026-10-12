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
  // Never rejects: callers (cancel, reject, no-show, booking) fire and forget,
  // so a throw here would become an unhandled rejection instead of a message
  // the patient can actually read.
  try {
    if (!userId) return;

    const key = getDedupeKey(userId, title, body);
    if (isDuplicate(key)) {
      console.log(`Notification deduped: "${title}" to user ${userId}`);
      return;
    }

    // The in-app row is written unconditionally. It used to sit inside
    // `if (user?.fcm_token)`, so a user without a device token - or one whose
    // token had expired - silently got no notification at all, push or in-app.
    await Notifications.create({
      user_id: userId,
      role: 'USER',
      message: body,
      seen: false
    });

    const user = await Users.findByPk(userId);
    if (user?.fcm_token) {
      return await pushNotification.send(user.fcm_token, title, body, null, null, extras, userId);
    }
  } catch (error) {
    console.error(`Notification to user ${userId} failed:`, error.message);
  }
};

const sendToDoctor = async (doctorId, title, body, extras = {}) => {
  try {
    if (!doctorId) return;

    const key = getDedupeKey(doctorId, title, body);
    if (isDuplicate(key)) {
      console.log(`Notification deduped: "${title}" to doctor ${doctorId}`);
      return;
    }

    // Same rule as above: the in-app row is not conditional on a push token.
    await Notifications.create({
      user_id: doctorId,
      role: 'DOCTOR',
      message: body,
      seen: false
    });

    const doctor = await Doctors.findByPk(doctorId);
    if (doctor?.fcm_token) {
      return await pushNotification.send(doctor.fcm_token, title, body, null, null, extras, doctorId);
    }
  } catch (error) {
    console.error(`Notification to doctor ${doctorId} failed:`, error.message);
  }
};

const sendToAllUsers = async (title, body, extras = {}) => {
  try {
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
  } catch (error) {
    console.error(`Broadcast notification to users failed:`, error.message);
  }
};

const sendToAllDoctors = async (title, body, extras = {}) => {
  try {
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
  } catch (error) {
    console.error(`Broadcast notification to doctors failed:`, error.message);
  }
};

const sendToAllAdmins = async (title, body, extras = {}) => {
  try {
    // Every admin gets the in-app row; only the ones holding a device token
    // get the push. Filtering on the token first meant an admin without a
    // token saw nothing at all.
    const admins = await Users.findAll({ where: { is_admin: true } });
    if (!admins.length) return;

    await Notifications.bulkCreate(admins.map(a => ({
      user_id: a.id,
      role: 'ADMIN',
      message: body,
      seen: false
    })));

    return Promise.allSettled(admins.filter(a => a.fcm_token).map(a => {
      const key = getDedupeKey(a.id, title, body);
      if (isDuplicate(key)) return { status: 'skipped', reason: 'dedup' };
      return pushNotification.send(a.fcm_token, title, body, null, null, extras, a.id);
    }));
  } catch (error) {
    console.error(`Notification to admins failed:`, error.message);
  }
};

module.exports = { sendToUser, sendToDoctor, sendToAllUsers, sendToAllDoctors, sendToAllAdmins };
