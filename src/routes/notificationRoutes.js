const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');

router.get('/',              authenticateToken, notificationController.getNotifications);
router.get('/unread-count',  authenticateToken, notificationController.getUnreadCount);
router.patch('/:id/read',    authenticateToken, notificationController.markRead);
router.patch('/read-all',    authenticateToken, notificationController.markAllRead);

// admin-only push / broadcast
router.post('/', authenticateToken, requireRole('admin'), notificationController.createNotification);

module.exports = router;