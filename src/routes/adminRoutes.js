// adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); // ✅ import controller
const authenticateToken = require('../middleware/authMiddleware');

// GET all requests — uses your SQL JOIN query in adminController
router.get('/requests', authenticateToken, adminController.getAllRequests);

// GET statistics
router.get('/statistics', authenticateToken, adminController.getStatistics);

module.exports = router;