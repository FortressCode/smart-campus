import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectPath?: string;
}

export default function RoleBasedRoute({
  children,
  allowedRoles,
  redirectPath = "/unauthorized",
}: RoleBasedRouteProps) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  const userRole = userData?.role || "student";

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={redirectPath} />;
  }

  return <>{children}</>;
}
