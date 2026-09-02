// routes/vehicleRoutes.js
const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, vehicleController.getMyVehicles);
router.post('/', authMiddleware, vehicleController.addVehicle);
router.put('/:id', authMiddleware, vehicleController.updateVehicle);
router.delete('/:id', authMiddleware, vehicleController.deleteVehicle);
router.patch('/:id/default', authMiddleware, vehicleController.setDefaultVehicle);

module.exports = router;

// In your main app/router file, mount this with:
// app.use('/vehicles', require('./routes/vehicleRoutes'));