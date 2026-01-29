import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  requireAll = true
}) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions.length) {
    const hasAccess = requireAll
      ? requiredPermissions.every((p) => hasPermission(p))
      : requiredPermissions.some((p) => hasPermission(p));

    if (!hasAccess) {
      return (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
          You do not have permission to view this page.
        </div>
      );
    }
  }

  return children;
};

