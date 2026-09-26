// controllers/userController.js
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
// At the very top of userController.js
const bcrypt = require('bcryptjs');


const { v4: uuidv4 } = require('uuid'); // npm install uuid


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
    return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, { expiresIn: '2d' });
};

const validateAndCorrectEmail = function (email) {
    if (!email) {
        return { isValid: false, message: 'Email is required' };
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, message: 'Please enter a valid email address' };
    }

    // Split email into local part and domain
    const [localPart, domain] = email.toLowerCase().trim().split('@');

    // Common domain corrections - FULL DOMAIN
    const fullDomainCorrections = {
        'gmail.con': 'gmail.com',
        'gmail.cm': 'gmail.com',
        'gmail.co': 'gmail.com',
        'gmail.c': 'gmail.com',
        'yahoo.con': 'yahoo.com',
        'yahoo.cm': 'yahoo.com',
        'yahoo.co': 'yahoo.com',
        'hotmail.con': 'hotmail.com',
        'hotmail.cm': 'hotmail.com',
        'hotmail.co': 'hotmail.com',
        'outlook.con': 'outlook.com',
        'outlook.cm': 'outlook.com',
        'outlook.co': 'outlook.com'
    };

    // Common TLD corrections - ONLY for the end of domain
    const tldCorrections = {
        '.comm': '.com',  // ← FIXES your .comm issue
        '.con': '.com',
        '.can': '.com',
        '.cmo': '.com',
        '.comn': '.com',
        '.coom': '.com',
        '.cpm': '.com',
        '.xom': '.com',
        '.vom': '.com'
    };

    let correctedDomain = domain;
    let hasCorrection = false;

    // 1. Check full domain corrections (e.g., gmail.con -> gmail.com)
    if (fullDomainCorrections[correctedDomain]) {
        correctedDomain = fullDomainCorrections[correctedDomain];
        hasCorrection = true;
    } else {
        // 2. Check TLD corrections (e.g., .comm -> .com) - ONLY at the end
        for (const [wrong, correct] of Object.entries(tldCorrections)) {
            if (correctedDomain.endsWith(wrong)) {
                correctedDomain = correctedDomain.slice(0, -wrong.length) + correct;
                hasCorrection = true;
                break;
            }
        }
    }

    // Check for missing dots in common domains (e.g., gmailcom -> gmail.com)
    if (!hasCorrection) {
        const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
        const domainWithoutDot = correctedDomain.replace(/\./g, '');

        for (const commonDomain of commonDomains) {
            const commonDomainWithoutDot = commonDomain.replace(/\./g, '');
            if (domainWithoutDot === commonDomainWithoutDot && correctedDomain !== commonDomain) {
                correctedDomain = commonDomain;
                hasCorrection = true;
                break;
            }
        }
    }

    // Construct corrected email
    const correctedEmail = `${localPart}@${correctedDomain}`;

    // If correction was made, return it
    if (hasCorrection && correctedEmail !== email.toLowerCase().trim()) {
        return {
            isValid: true,
            correctedEmail: correctedEmail,
            message: `Did you mean ${correctedEmail}?`
        };
    }

    return { isValid: true, correctedEmail: null };
};





const userController = {

    // REGISTER
    register: async (req, res) => {
        try {
            const { name, email, phone, password, role } = req.body;

            if (!name || !email || !phone || !password || !role) {
                return res.status(400).json({ error: "All fields are required" });
            }

            // ===== EMAIL VALIDATION AND CORRECTION =====
            const emailValidation = validateAndCorrectEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({ error: emailValidation.message });
            }
            const correctedEmail = emailValidation.correctedEmail || email;

            // Check if user already exists (using corrected email)
            const userExists = await User.findByEmail(correctedEmail);
            if (userExists) {
                return res.status(400).json({ error: 'User already exists' });
            }

            // Create user with corrected email
            const userId = await User.create({
                name,
                email: correctedEmail, // ← SAVES CORRECTED EMAIL
                phone,
                password,
                role
            });

            const token = generateToken(userId);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: userId,
                    name,
                    email: correctedEmail,
                    phone,
                    role
                }
            });

        } catch (error) {
            console.error('Registration error:', error);

            if (error.code === 'DUPLICATE_EMAIL') {
                return res.status(400).json({
                    error: 'Email already in use. Please use a different email address.'
                });
            }

            res.status(500).json({ error: error.message });
        }
    },




    login: async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await User.verificationPassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const actualUserId = user.id || user.user_id || user._id || user.ID;

        // Option 1: SIMPLE - Just allow login and overwrite session (last login wins)
        // This is what you had originally and it works!
        const sessionId = uuidv4();
        await User.setLoginSession(actualUserId, sessionId);

        const token = jwt.sign(
            { id: actualUserId, role: user.role, sessionId },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
        );

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
},//dfdfadsf


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

            // ===== EMAIL VALIDATION AND CORRECTION =====
            const emailValidation = validateAndCorrectEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: emailValidation.message
                });
            }
            const correctedEmail = emailValidation.correctedEmail || email;

            // ===== PHILIPPINE PHONE VALIDATION =====
            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            const phPhoneRegex = /^(09\d{9}|\+639\d{9})$/;
            if (!phPhoneRegex.test(cleanPhone)) {
                return res.status(400).json({
                    success: false,
                    message: 'Enter a valid PH number: start with 09XXXXXXXXX or +639XXXXXXXXX'
                });
            }

            // Password strength validation
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    success: false,
                    message: '😤😒😒😒'
                });
            }

            // Check if email already exists (using corrected email)
            const existing = await User.findByEmail(correctedEmail);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }

            // Create user with corrected email
            const newUserId = await User.create({
                name,
                email: correctedEmail, // ← SAVES CORRECTED EMAIL
                phone: cleanPhone,
                role,
                password
            });

            const newUser = await User.findById(newUserId);
            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: newUser
            });

        } catch (error) {
            console.error('Create user error:', error);
            if (error.code === 'DUPLICATE_EMAIL') {
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            res.status(500).json({
                success: false,
                message: 'Server error: ' + error.message
            });
        }
    },
    checkEmailAvailability: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required'
                });
            }

            // Email validation and correction
            const emailValidation = validateAndCorrectEmail(email);
            if (!emailValidation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: emailValidation.message
                });
            }

            // Use corrected email if available
            const correctedEmail = emailValidation.correctedEmail || email;

            // Check if email exists in database
            const userExists = await User.findByEmail(correctedEmail);

            // Return availability with correction suggestion
            res.json({
                success: true,
                available: !userExists,
                correctedEmail: emailValidation.correctedEmail || null,
                message: emailValidation.correctedEmail ? `Did you mean ${correctedEmail}?` : null
            });
        } catch (error) {
            console.error('Email check error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error: ' + error.message
            });
        }
    },
    logout: async (req, res) => {
        try {
            await User.(req.user.id, null);
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },
    updateProfilePicture: async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: 'No profile picture uploaded.'
                });
            }

            const userId = req.user.id;

            const profilePicture =
                `uploads/profile_pictures/${req.file.filename}`;

            await User.updateProfilePicture(
                userId,
                profilePicture
            );

            res.json({
                message: 'Profile picture updated successfully.',
                profile_picture: profilePicture
            });

        } catch (error) {

            console.error(
                'Update profile picture error:',
                error
            );

            res.status(500).json({
                message: 'Failed to update profile picture.'
            });
        }
    },

};

// module.exports = userController;
module.exports = {
    ...userController,
    generateToken
};
