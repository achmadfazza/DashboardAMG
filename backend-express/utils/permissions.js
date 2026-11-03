// Role definitions
const ROLES = {
   ADMIN: 'admin',
   MANAGER: 'manager',
   USER: 'user',
};

// Permission definitions
const PERMISSIONS = {
   CREATE_USER: 'create:user',
   READ_USER: 'read:user',
   UPDATE_USER: 'update:user',
   DELETE_USER: 'delete:user',
   MANAGE_ROLES: 'manage:roles',
   MANAGE_DEPARTMENT: 'manage:department',
   READ_DEPARTMENT: 'read:department',
};

// Map roles to permissions
const ROLE_PERMISSIONS = {
   [ROLES.ADMIN]: [
      PERMISSIONS.CREATE_USER,
      PERMISSIONS.READ_USER,
      PERMISSIONS.UPDATE_USER,
      PERMISSIONS.DELETE_USER,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.MANAGE_DEPARTMENT,
      PERMISSIONS.READ_DEPARTMENT,
   ],
   [ROLES.MANAGER]: [
      PERMISSIONS.READ_USER,
      PERMISSIONS.CREATE_USER,
      PERMISSIONS.DELETE_USER,
      PERMISSIONS.READ_DEPARTMENT,
   ],
   [ROLES.USER]: [
      PERMISSIONS.READ_USER,
      PERMISSIONS.CREATE_USER,
   ],
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS };
