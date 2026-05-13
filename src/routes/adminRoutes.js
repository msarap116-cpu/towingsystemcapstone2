// adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); 
const authenticateToken = require('../middleware/authMiddleware');

router.get('/requests', authenticateToken, adminController.getAllRequests);

// GET statistics pero wala pa
router.get('/statistics', authenticateToken, adminController.getStatistics);

module.exports = router;