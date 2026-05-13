const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
// const authenticateToken = require('../middleware/authMiddleware');

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);

router.post('/', authMiddleware, userController.createUser); 

router.get('/profile', authMiddleware, userController.getProfile);
// router.put('/profile', authMiddleware, userController.updateProfile);
// router.get('/drivers', authMiddleware, userController.getAllDrivers);

//get all the users
router.get('/',authMiddleware,userController.getAllUsers);
// get single user
router.get('/:id', authMiddleware, userController.getUserById);

// update user
router.put('/:id', authMiddleware, userController.updateUser);

// delete user
router.delete('/:id', authMiddleware, userController.deleteUser);

// Temporarily add this in userroutes
router.get('/test', (req, res) => {
    res.json({ message: 'route works' });
});
module.exports = router;