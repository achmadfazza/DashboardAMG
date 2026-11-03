const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authMiddleware');
const { requirePermission, requireRole } = require('../middlewares/rbacMiddleware');
const { PERMISSIONS, ROLES } = require('../utils/permissions');

// ==========================================
// PROFILE ROUTES (Own profile - any authenticated user)
// ==========================================
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// ==========================================
// ADMIN DASHBOARD (Must be before /:id to avoid conflict)
// ==========================================
router.get(
   '/admin/dashboard',
   authenticateToken,
   requireRole(ROLES.ADMIN),
   (req, res) => {
      res.json({
         message: 'Selamat datang di dashboard admin.',
         user: {
            id: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            nik: req.user.nik
         }
      });
   }
);

// ==========================================
// USER MANAGEMENT ROUTES (Admin only)
// ==========================================

// Get all users
router.get(
   '/',
   authenticateToken,
   requirePermission(PERMISSIONS.READ_USER),
   userController.getAllUsers
);

// Get user by ID
router.get(
   '/:id',
   authenticateToken,
   requirePermission(PERMISSIONS.READ_USER),
   userController.getUserById
);

// Create new user
router.post(
   '/',
   authenticateToken,
   requirePermission(PERMISSIONS.CREATE_USER),
   userController.createUser
);

// Update user
router.put(
   '/:id',
   authenticateToken,
   requirePermission(PERMISSIONS.UPDATE_USER),
   userController.updateUser
);

// Update user password
router.put(
   '/:id/password',
   authenticateToken,
   requirePermission(PERMISSIONS.UPDATE_USER),
   userController.updatePassword
);

// Delete user
router.delete(
   '/:id',
   authenticateToken,
   requirePermission(PERMISSIONS.DELETE_USER),
   userController.deleteUser
);

module.exports = router;
