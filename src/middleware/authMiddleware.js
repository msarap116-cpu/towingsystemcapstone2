const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticateToken = async (req, res, next) => {

    const authHeader = req.headers.authorization;

    // No Authorization header
    if (!authHeader) {
        return res.status(401).json({
            // message: 'No token provided',

            code: 'NO_TOKEN'
        });
    }

    // Must be "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        console.warn(' Malformed Authorization header:', authHeader);

        return res.status(401).json({
            message: 'Invalid authorization format',
            code: 'INVALID_AUTH_FORMAT'
        });
    }

    const token = parts[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const currentSessionId = await User.getSessionId(decoded.id);

        if (!currentSessionId) {
            return res.status(401).json({
                message: 'Session no longer exists',
                code: 'SESSION_EXPIRED'
            });
        }

        // Another browser/device logged in
        if (decoded.sessionId !== currentSessionId) {

            console.log(
                `Session replaced for user ${decoded.id}`
            );

            return res.status(401).json({
                message: 'Session expired: logged in elsewhere',
                code: 'SESSION_REPLACED'
            });
        }

        req.user = decoded;

        next();

    } catch (err) {

        if (err.name === 'TokenExpiredError') {

            return res.status(401).json({
                message: 'Session expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        if (err.name === 'JsonWebTokenError') {

            console.warn('Invalid JWT received');

            return res.status(401).json({
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        console.error('Authentication error:', err);

        return res.status(401).json({
            message: 'Authentication failed',
            code: 'AUTH_FAILED'
        });
    }
};


// const authenticateToken = (req, res, next) => {

//     const authHeader = req.headers['authorization'];

//     // console.log('Auth header:', authHeader); // ← add this to debug
//     // console.log("VERIFY SECRET:", process.env.JWT_SECRET);
//     const token = req.headers.authorization?.split(" ")[1];

//     if (!token) {
//         return res.status(401).json({ message: "No token provided" });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);

//         //  { id: userId } from the token
//         req.user = decoded;  // req.user.id will be available

//         next();
//     } catch (err) {
//         return res.status(401).json({ message: "Invalid token" });
//     }
// };

module.exports = authenticateToken;