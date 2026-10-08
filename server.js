// D:\towing_system1\server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./src/database/database');


// const User = require('./src/models/userModel');
// const { generateToken } = require('./src/controllers/userController');

// Import routes
const userroutes = require('./src/routes/userroutes');
const requestsRoute = require('./src/routes/requestRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const earningsRoutes = require('./src/routes/earningsRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Make io reachable from any route: req.app.get('io')
app.set('io', io);

// Connection handler
io.on('connection', (socket) => {
  console.log('🔌 socket connected:', socket.id);

  // Auth (optional): read token from handshake
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      // If you have a verifyToken helper, use it:
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // socket.userId = decoded.id;
      // socket.join(`driver:${decoded.id}`);
      console.log('   auth token present');
    } catch (e) {
      console.log('   invalid token:', e.message);
    }
  }

  socket.on('disconnect', (reason) => {
    console.log('❌ socket disconnected:', socket.id, reason);
  });
});


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/users/', userroutes);
app.use('/api/requests', requestsRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/payments',paymentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/earnings',earningsRoutes);
app.use('/api/settings', settingsRoutes);


// global error handler — keep JSON errors JSON,
app.use((err, req, res, next) => {
    // Safely log whatever we got
    const message =
        (err && err.message) ||
        (typeof err === 'string' ? err : null) ||
        (err === undefined ? 'undefined (nothing passed to next())' : String(err));

    console.error('Unhandled error:', message);
    console.error('  route:', req.method, req.originalUrl);
    console.error('  stack:', err && err.stack ? err.stack : '(no stack)');

    if (res.headersSent) return next(err);

    // If err is not a real Error, don't leak "undefined" to the client
    res.status(500).json({
        success: false,
        message: message,
        route: `${req.method} ${req.originalUrl}`,
    });
});

// HTML page routes
app.get(['/', '/home'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/driver-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'driver-dashboard.html'));
});

app.get('/requestform', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'requestform.html'));
});

app.get('/myvehicles', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'myvehicles.html'));
});

app.use('/uploads',express.static(path.join(__dirname, 'uploads')));

app.get('/api/geocode/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const params = new URLSearchParams({
      key: process.env.LOCATION_ID_KEY,
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
    });

    const locationIqResponse = await fetch(
      `https://us1.locationiq.com/v1/reverse?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    );

    const responseText = await locationIqResponse.text();

    if (!locationIqResponse.ok) {
      console.error('LocationIQ reverse error:', locationIqResponse.status, responseText);
      return res.status(locationIqResponse.status).json({ error: 'LocationIQ reverse geocoding failed' });
    }

    const data = JSON.parse(responseText);

    return res.json({
      address: data.display_name || null,
      latitude: data.lat || lat,
      longitude: data.lon || lng,
    });
  } catch (error) {
    console.error('Reverse geocoding backend error:', error);
    return res.status(500).json({ error: 'Reverse geocoding failed', details: error.message });
  }
});

app.get('/api/geocode/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'q is required' });
    }

    const params = new URLSearchParams({
      key: process.env.LOCATION_ID_KEY,
      q: `${q}, Philippines`,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ph',
    });

    const locationIqResponse = await fetch(
      `https://us1.locationiq.com/v1/search?${params.toString()}`,
      { headers: { Accept: 'application/json' } }
    );

    const responseText = await locationIqResponse.text();

    if (!locationIqResponse.ok) {
      console.error('LocationIQ search error:', locationIqResponse.status, responseText);
      return res.status(locationIqResponse.status).json({ error: 'LocationIQ search failed' });
    }

    return res.json(JSON.parse(responseText));
  } catch (error) {
    console.error('Forward geocoding backend error:', error);
    return res.status(500).json({ error: 'Forward geocoding failed', details: error.message });
  }
});



async function startServer() {
    try {
        const dbConnected = await db.testConnection();

        if (!dbConnected) {
            console.error('FAILED TO CONNECT TO DATABASE');
        } else {
            console.log('Database connection successful');
        }

        // app.listen(PORT, () => {
        //     app.listen(3000,'0.0.0.0',() =>{
        //     console.log(`\n Server running on http://localhost:${PORT}`);
        //     console.log(`   Home: http://localhost:${PORT}/home`);
        //     console.log(`   Login: http://localhost:${PORT}/login`);
        //     console.log(`   Register: http://localhost:${PORT}/register`);
        //     console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
        // });
          server.listen(PORT, '0.0.0.0', () => {
            console.log(`\n Server running on http://localhost:${PORT}`);
            console.log(`   Home: http://localhost:${PORT}/home`);
            console.log(`   Login: http://localhost:${PORT}/login`);
            console.log(`   Register: http://localhost:${PORT}/register`);
            console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
            console.log(`   Socket.IO listening on ws://localhost:${PORT}`);
          });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();