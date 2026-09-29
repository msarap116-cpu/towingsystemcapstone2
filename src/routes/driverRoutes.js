// routes/driverRoutes.js
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const uploadCompletionPhoto = require('../middleware/uploadCompletionPhoto'); // added
const driverController = require('../controllers/driverController');

router.post('/location', authenticateToken, driverController.saveLocation);
router.get('/requests/latest', authenticateToken, driverController.getLatestRequest);
router.post('/requests/:id/route-estimate', authenticateToken, driverController.saveRouteEstimate);

router.post(
  '/trips/:requestId/complete-photo',
  authenticateToken,
  uploadCompletionPhoto.single('photo'),
  driverController.completeJobWithPhoto
);

module.exports = router;