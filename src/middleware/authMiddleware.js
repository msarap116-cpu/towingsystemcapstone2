const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            code: 'NO_TOKEN'
        });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        console.warn('Malformed Authorization header');

        return res.status(401).json({
            message: 'Invalid authorization format',
            code: 'INVALID_AUTH_FORMAT'
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // console.log('Decoded token:', decoded);

        const currentSessionId = await User.getSessionId(decoded.id);

        if (!currentSessionId) {
            return res.status(401).json({
                message: 'Session no longer exists',
                code: 'SESSION_EXPIRED'
            });
        }

        if (decoded.sessionId !== currentSessionId) {
            console.log(`Session replaced for user ${decoded.id}`);

            return res.status(401).json({
                message: 'Session expired: logged in elsewhere',
                code: 'SESSION_REPLACED'
            });
        }

        req.user = decoded;

        return next();
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

module.exports = authenticateToken;
