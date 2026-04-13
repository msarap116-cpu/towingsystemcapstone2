// controllers/userController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
// At the very top of userController.js
const bcrypt = require('bcryptjs');

// const generateToken = (userId) => {
//     // Use 'id' consistently (not user_id)
//     return jwt.sign(
//         { id: userId },  // Use 'id' to match your authMiddleware expectations
//         process.env.JWT_SECRET, 
//         { expiresIn: '30d' }
//     );
   
// };
// After — stores id AND role:
const generateToken = (userId, role) => {
    return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const userController = {

    // REGISTER
    register: async (req, res) => {
        try {
            const { name, email, phone, password, role } = req.body;

            if (!name || !email || !phone || !password || !role) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const userExists = await User.findByEmail(email);
            if (userExists) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const userId = await User.create({ name, email, phone, password, role });

            const token = generateToken(userId);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: { 
                    id: userId,      // Use 'id' consistently
                    name, 
                    email, 
                    phone, 
                    role 
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // ✅ FIXED LOGIN
    login: async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        //   CRITICAL DEBUG: Check what user object contains
        // console.log(' FULL user object:', JSON.stringify(user, null, 2));
        // console.log(' user.id:', user.id);
        console.log(' user.user_id:', user.user_id);
        // console.log(' user._id:', user._id);

        const isMatch = await User.verificationPassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        //   Find which field actually contains the ID
        const actualUserId = user.id || user.user_id || user._id || user.ID;
        
        console.log(' Using this as userId:', actualUserId);

        console.log("SIGN SECRET:", process.env.JWT_SECRET);
        // Generate token with the correct ID
        // const token = generateToken(actualUserId);
        const token = generateToken(actualUserId,user.role);

        //   Verify token contains id
        const decoded = jwt.decode(token);
        // console.log(' Decoded token after generation:', decoded);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: actualUserId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
       

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
},

    // FIXED PROFILE
    getProfile: async (req, res) => {
        try {
            // req.user comes from authMiddleware
            // Since token has { id: userId }, we use req.user.id
            const userId = req.user.id;
            
            if (!userId) {
                return res.status(401).json({ error: 'Invalid token, user ID missing' });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Don't send password
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);

        } catch (error) {
            console.error('getProfile error:', error);
            res.status(500).json({ error: 'Server error fetching profile' });
        }
    },

    // UPDATE PROFILE
    updateProfile: async (req, res) => {
        try {
            const { name, phone } = req.body;
            const userId = req.user.id; // Get from token

            await User.update(userId, { name, phone });

            res.json({ message: 'Profile updated successfully' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Server error' });
        }
    },

    // GET ALL USERS
    getAllUsers: async (req, res) => {
        try {
            const users = await User.getAllUsers();
            // Remove passwords from all users
            const usersWithoutPasswords = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            res.json(usersWithoutPasswords);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Server error" });
        }
    },

    // GET USER BY ID
    getUserById: async (req, res) => {
        try {
            const id = req.params.id;
            const user = await User.findById(id);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);

        } catch (error) {
            console.error("getUserById error:", error);
            res.status(500).json({ error: "Server error" });
        }
    },

    // UPDATE USER
    updateUser: async (req, res) => {
        const { name, email, phone, role } = req.body;
        const userId = req.params.id;

        try {
            await User.update(userId, { name, email, phone, role });
            res.json({ message: "User updated successfully" });
            
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Server error" });
        }
        console.log("Update ID:", req.params.id);
        console.log("Body:", req.body);
    },

    deleteUser: async (req, res) => {
    try {
        const id = req.params.id;
        await User.delete(id);          // ← must match the method name in userModel.js
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
},

    // GET MY REQUESTS
    getMyRequests: async (req, res) => {
        try {
            const userId = req.user.id; // Get from token
            const requests = await Request.findByUserId(userId);
            res.json(requests);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    },

     createUser: async (req, res) => {
    try {
        const { name, email, phone, role, password } = req.body;

        // Validation
        if (!name || !email || !phone || !role || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check if email already exists
        const existing = await User.findByEmail(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Email already in use'
            });
        }

       
        const newUserId = await User.create({
            name,
            email,
            phone,
            role,
            password  
        });

        // Fetch the newly created user to return it
        const newUser = await User.findById(newUserId);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: newUser
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
},
};

// module.exports = userController;
module.exports = {
    ...userController,
    generateToken
};