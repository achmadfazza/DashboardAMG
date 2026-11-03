const { ROLE_PERMISSIONS } = require('../utils/permissions');

/**
 * Middleware untuk memeriksa apakah user memiliki permission tertentu
 * @param {string} permission - Permission yang dibutuhkan
 */
const requirePermission = (permission) => {
   return (req, res, next) => {
      const userRole = req.user?.role;

      if (!userRole) {
         return res.status(403).json({ message: 'Akses ditolak. Role tidak ditemukan.' });
      }

      const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

      if (!rolePermissions.includes(permission)) {
         return res.status(403).json({ message: 'Akses ditolak. Permission tidak mencukupi.' });
      }

      next();
   };
};

/**
 * Middleware untuk memeriksa apakah user memiliki role tertentu
 * @param {...string} allowedRoles - Role yang diizinkan
 */
const requireRole = (...allowedRoles) => {
   return (req, res, next) => {
      const userRole = req.user?.role;

      if (!userRole) {
         return res.status(403).json({ message: 'Akses ditolak. Role tidak ditemukan.' });
      }

      if (!allowedRoles.includes(userRole)) {
         return res.status(403).json({ message: 'Akses ditolak. Role tidak diizinkan.' });
      }

      next();
   };
};

module.exports = { requirePermission, requireRole };
