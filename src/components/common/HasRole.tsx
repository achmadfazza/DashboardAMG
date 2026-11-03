import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";
import type { ReactNode } from "react";

interface HasRoleProps {
  roles: UserRole | UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user role.
 * 
 * @example
 * <HasRole roles="admin">
 *   <AdminButton />
 * </HasRole>
 * 
 * @example
 * <HasRole roles={["admin", "manager"]}>
 *   <ManagerPanel />
 * </HasRole>
 * 
 * @example
 * <HasRole roles="admin" fallback={<p>Access denied</p>}>
 *   <SensitiveData />
 * </HasRole>
 */
export default function HasRole({ roles, children, fallback = null }: HasRoleProps) {
  const { hasRole } = useAuth();

  if (hasRole(roles)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
