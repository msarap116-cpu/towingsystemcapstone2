// routes/notificationRoute.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');

router.get('/', authenticateToken, notificationController.getNotifications);
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);
router.patch('/:id/read', authenticateToken, notificationController.markRead);
router.patch('/read-all', authenticateToken, notificationController.markAllRead);

module.exports = router;