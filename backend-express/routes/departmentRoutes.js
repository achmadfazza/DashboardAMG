const express = require('express');
const router = express.Router();

const departmentController = require('../controllers/departmentController');
const authenticateToken = require('../middlewares/authMiddleware');
const { requirePermission } = require('../middlewares/rbacMiddleware');
const { PERMISSIONS } = require('../utils/permissions');

// ==========================================
// DEPARTMENT ROUTES (Admin only - manage:department)
// ==========================================
router.get(
   '/',
   authenticateToken,
   requirePermission(PERMISSIONS.READ_DEPARTMENT),
   departmentController.getDepartments
);

router.post(
   '/',
   authenticateToken,
   requirePermission(PERMISSIONS.MANAGE_DEPARTMENT),
   departmentController.createDepartment
);

router.put(
   '/:id',
   authenticateToken,
   requirePermission(PERMISSIONS.MANAGE_DEPARTMENT),
   departmentController.updateDepartment
);

router.delete(
   '/:id',
   authenticateToken,
   requirePermission(PERMISSIONS.MANAGE_DEPARTMENT),
   departmentController.deleteDepartment
);

module.exports = router;
