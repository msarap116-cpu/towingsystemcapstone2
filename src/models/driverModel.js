// models/driverModel.js
const db = require('../database/database');

// Assign driver to a service request
exports.assignDriverToRequest = async (driver_id, request_id) => {
  return db.query(
    `UPDATE service_requests
     SET driver_id = ?, status = 'in progress'
     WHERE request_id = ?`,
    [driver_id, request_id]
  );
};

// Insert a new location row
exports.insertDriverLocation = async (driver_id, lat, lng) => {
  return db.query(
    `INSERT INTO driver_locations (driver_id, lat, lng)
     VALUES (?, ?, ?)`,
    [driver_id, lat, lng]
  );
};

// Get the latest active request + driver location for a user
exports.findLatestActiveRequest = async (user_id) => {
  const [rows] = await db.query(
    `SELECT sr.request_id,
            sr.location_lat,
            sr.location_lng,
            sr.address,
            sr.status,
            dl.lat AS driver_lat,
            dl.lng AS driver_lng,
            dl.recorded_at
     FROM service_requests sr
     LEFT JOIN driver_locations dl
            ON dl.driver_id = sr.driver_id
     WHERE sr.user_id = ?
       AND sr.status IN ('pending', 'assigned', 'in progress')
     ORDER BY sr.created_at DESC
     LIMIT 1`,
    [user_id]
  );
  return rows[0] || null;
};

// Mark a trip as completed with photo
exports.markTripComplete = async (requestId, driverId, photoPath) => {
  return db.query(
    `UPDATE service_requests
     SET status = 'completed', completion_photo = ?
     WHERE request_id = ? AND driver_id = ?`,
    [photoPath, requestId, driverId]
  );
};
exports.updateRouteEstimate = async ({ requestId, driverId, distanceKm, durationMin }) => {
  const result = await db.query(
    `UPDATE driver_assignments
     SET estimated_distance_km = ?,
         estimated_time_minutes = ?,
         updated_at = NOW()
     WHERE request_id = ?
       AND driver_id = ?
       AND status NOT IN ('completed','cancelled')`,
    [distanceKm, durationMin, requestId, driverId]
  );
  return result; // has affectedRows
};
exports.completeRequestWithPhoto = async (requestId, status, photoUrl) => {
  return db.query(
    `UPDATE service_requests
     SET status = ?, completion_photo_url = ?, completed_at = NOW()
     WHERE request_id = ?`,
    [status, photoUrl, requestId]
  );
};