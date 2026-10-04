// utils/notify.js
const Notification = require('../models/notificationModel');

async function safeNotify(promiseFn) {
  try {
    await promiseFn();
  } catch (err) {
    console.error('[notify] non-fatal:', err.message);
  }
}

/** Notify a single user */
function notifyUser(userId, { requestId = null, type, message }) {
  return safeNotify(() =>
    Notification.create({ userId, requestId, type, message })
  );
}

/** Notify every active user with a role */
function notifyRole(role, { requestId = null, type, message }) {
  return safeNotify(() =>
    Notification.createForRole(role, { requestId, type, message })
  );
}

module.exports = { notifyUser, notifyRole };