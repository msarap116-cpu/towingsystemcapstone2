// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');



const authenticateToken = (req, res, next) => {

    const authHeader = req.headers['authorization'];

    // console.log('Auth header:', authHeader); // ← add this to debug
    // console.log("VERIFY SECRET:", process.env.JWT_SECRET);
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        //  { id: userId } from the token
        req.user = decoded;  // req.user.id will be available
        
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = authenticateToken;