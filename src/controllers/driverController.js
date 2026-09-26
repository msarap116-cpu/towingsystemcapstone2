// controllers/driverController.js
const driverModel = require('../models/driverModel');

// POST /location
exports.saveLocation = async (req, res) => {
  const { lat, lng, request_id } = req.body;
  const driver_id = req.user.id;

  if (!lat || !lng || !request_id) {
    return res.status(400).json({ error: 'lat, lng, and request_id are required' });
  }

  try {
    await driverModel.assignDriverToRequest(driver_id, request_id);
    await driverModel.insertDriverLocation(driver_id, lat, lng);

    res.json({ success: true });
  } catch (err) {
    console.error('Error saving driver location:', err);
    res.status(500).json({ error: 'Failed to save location' });
  }
};

// GET /requests/latest
exports.getLatestRequest = async (req, res) => {
  const user_id = req.user.id;

  try {
    const request = await driverModel.findLatestActiveRequest(user_id);

    if (!request) {
      return res.status(404).json({ error: 'No active request found' });
    }

    res.json(request);
  } catch (err) {
    console.error('Error fetching request:', err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
};

// POST /trips/:requestId/complete-photo
exports.completeJobWithPhoto = async (req, res) => {
  const { requestId } = req.params;
  const driverId = req.user.id;
  const photo = req.file;

  if (!photo) {
    return res.status(400).json({ error: 'Photo is required' });
  }

  try {
    await driverModel.markTripComplete(requestId, driverId, photo.path);
    res.json({ success: true });
  } catch (err) {
    console.error('Error completing job:', err);
    res.status(500).json({ error: 'Failed to complete job' });
  }
};
exports.saveRouteEstimate = async (req, res) => {
  const driver_id = req.user.id;
  const { id } = req.params; // request_id
  const { distanceKm, durationMin } = req.body;

  // Input validation (HTTP concern)
  if (!Number.isFinite(Number(distanceKm)) || !Number.isFinite(Number(durationMin))) {
    return res.status(400).json({ error: 'Invalid distance/duration' });
  }

  try {
    const result = await driverModel.updateRouteEstimate({
      requestId: id,
      driverId: driver_id,
      distanceKm: Number(distanceKm),
      durationMin: Math.round(Number(durationMin)),
    });

    if (result.affectedRows === 0) {
      // Not fatal — assignment might not exist yet or already closed
      console.warn(
        `No active assignment to update estimate for request ${id}, driver ${driver_id}`
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('saveRouteEstimate error:', err);
    res.status(500).json({ error: err.message });
  }
};
