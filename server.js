// D:\towing_system1\server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import database connection
const db = require('./src/database/database');

// Import User Model
const User = require('./src/models/userModel');

// Import JWT function from userController (RECOMMENDED)
const { generateToken } = require('./src/controllers/userController');

// Import routes
const userroutes = require('./src/routes/userroutes');
const requestsRoute = require('./src/routes/requestRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const earningsRoutes = require('./src/routes/earningsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.post('/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt for:', email);

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token using the function from userController
        const token = generateToken(user.id, user.role);


        const { password: _, ...userWithoutPassword } = user;

        console.log('Login successful for:', email);

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
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
            app.listen(3000,'0.0.0.0',() =>{
            console.log(`\n Server running on http://localhost:${PORT}`);
            console.log(`   Home: http://localhost:${PORT}/home`);
            console.log(`   Login: http://localhost:${PORT}/login`);
            console.log(`   Register: http://localhost:${PORT}/register`);
            console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();