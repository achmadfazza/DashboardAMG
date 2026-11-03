import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

interface ProtectedRouteProps {
  roles?: UserRole[];
  permissions?: string[];
  children?: React.ReactNode;
}

export default function ProtectedRoute({ roles, permissions, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyRole, hasAnyPermission } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to sign in
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (roles && roles.length > 0) {
    if (!hasAnyRole(roles)) {
      // User doesn't have required role — redirect to unauthorized or dashboard
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Permission-based access control
  if (permissions && permissions.length > 0 && !hasAnyPermission(permissions)) {
    // User doesn't have required permission — redirect to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  // Render children if provided, otherwise render Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
}
