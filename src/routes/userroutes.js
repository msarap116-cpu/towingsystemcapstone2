// userroutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const uploadProfilePicture = require('../middleware/uploadProfilePicture');
// const authenticateToken = require('../middleware/authMiddleware');

function noStore(req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    next();
}

// Public routes
router.post('/register',noStore,userController.register);

router.post('/login',noStore,userController.login);

router.post('/check-email',noStore, userController.checkEmailAvailability);


router.post('/', authMiddleware, userController.createUser);

router.get('/profile', authMiddleware,noStore, userController.getProfile);

// router.put('/profile', authMiddleware, userController.updateProfile);

// router.get('/drivers', authMiddleware, userController.getAllDrivers);

router.post('/logout',authMiddleware,noStore, userController.logout);

router.put('/profile-picture',authMiddleware,uploadProfilePicture.single('profile_picture'),noStore, userController.updateProfilePicture);
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