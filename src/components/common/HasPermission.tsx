import { useAuth } from "../../context/AuthContext";
import type { Permission } from "../../types/auth";
import type { ReactNode } from "react";

interface HasPermissionProps {
  permissions: Permission | Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user permissions.
 *
 * @example
 * <HasPermission permissions="update:user">
 *   <EditButton />
 * </HasPermission>
 *
 * @example
 * <HasPermission permissions={["read:user", "create:user"]}>
 *   <GuestBookActions />
 * </HasPermission>
 */
export default function HasPermission({
  permissions,
  children,
  fallback = null,
}: HasPermissionProps) {
  const { hasAnyPermission } = useAuth();
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  if (hasAnyPermission(permissionList)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
