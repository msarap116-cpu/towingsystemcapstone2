
//controllers/notificationController.js
const Notification = require('../models/notificationModel');

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const rows = await Notification.getByUser(userId, limit, offset);
    res.json(rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to load unread count' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.markRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};