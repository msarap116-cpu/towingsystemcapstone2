// routes/driverRoutes.js
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const driverController = require('../controllers/driverController');
// const { uploadCompletionPhoto } = require('../middleware/uploadMiddleware');

// Save driver location + assign to request
router.post('/location', authenticateToken, driverController.saveLocation);

// Get latest active request for user
router.get('/requests/latest', authenticateToken, driverController.getLatestRequest);
// add to your routes
router.post('/requests/:id/route-estimate', authenticateToken, driverController.saveRouteEstimate);
// Complete trip with photo
// router.post(
//   '/trips/:requestId/complete-photo',
//   authenticateToken,
//   uploadCompletionPhoto.single('photo'),
//   driverController.completeJobWithPhoto
// );

module.exports = router;