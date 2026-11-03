export type UserRole = "admin" | "manager" | "user";

export const PERMISSIONS = {
   CREATE_USER: "create:user",
   READ_USER: "read:user",
   UPDATE_USER: "update:user",
   DELETE_USER: "delete:user",
   MANAGE_ROLES: "manage:roles",
   MANAGE_DEPARTMENT: "manage:department",
   READ_DEPARTMENT: "read:department",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
   admin: [
      PERMISSIONS.CREATE_USER,
      PERMISSIONS.READ_USER,
      PERMISSIONS.UPDATE_USER,
      PERMISSIONS.DELETE_USER,
      PERMISSIONS.MANAGE_ROLES,
      PERMISSIONS.MANAGE_DEPARTMENT,
      PERMISSIONS.READ_DEPARTMENT,
   ],
   manager: [PERMISSIONS.READ_USER, PERMISSIONS.CREATE_USER, PERMISSIONS.DELETE_USER, PERMISSIONS.READ_DEPARTMENT],
   user: [PERMISSIONS.READ_USER, PERMISSIONS.CREATE_USER],
};

export interface Department {
   id: string;
   department_name: string;
   created_at: string;
}

export interface User {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
