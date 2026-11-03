const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const authenticateToken = require('../middlewares/authMiddleware');

// Route Auth (Public)
router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

// Route Auth (Protected - any authenticated user can logout)
router.post('/signout', authenticateToken, authController.signout);

module.exports = router;
