const db = require('../database/database');

async function create({ userId, requestId = null, type, message }) {
  const result = await db.query(
    `INSERT INTO notifications (user_id, request_id, type, message)
     VALUES (?, ?, ?, ?)`,
    [userId, requestId, type, message]
  );
  return {
    notification_id: result.insertId,
    user_id: userId,
    request_id: requestId,
    type,
    message,
    is_read: 0
  };
}

// Broadcast to every user with a given role (e.g. all admins)
async function createForRole(role, { requestId = null, type, message }) {
  const users = await db.query(
    `SELECT user_id FROM users WHERE role = ? AND is_active = 1`,
    [role]
  );
  if (!users || users.length === 0) return;

  const placeholders = users.map(() => '(?, ?, ?, ?)').join(', ');
  const values = users.flatMap(u => [u.user_id, requestId, type, message]);

  await db.query(
    `INSERT INTO notifications (user_id, request_id, type, message) VALUES ${placeholders}`,
    values
  );
}

async function getByUser(userId, limit = 20, offset = 0) {
  return db.query(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
    [userId]
  );
  // limit/offset inlined (sanitized via parseInt) since mysql2 prepared
  // statements can choke on placeholders there in some versions
}

async function getUnreadCount(userId) {
  const rows = await db.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return rows[0].count;
}

async function markRead(notificationId, userId) {
  return db.query(
    `UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

async function markAllRead(userId) {
  return db.query(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
}

module.exports = { create, createForRole, getByUser, getUnreadCount, markRead, markAllRead };