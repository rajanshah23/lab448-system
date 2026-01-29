import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export const ProtectedRoute = ({ children, requiredPermissions = [] }) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    requiredPermissions.length &&
    !requiredPermissions.every((p) => hasPermission(p))
  ) {
    return (
      <div className="p-8 text-center text-slate-300">
        You do not have permission to view this page.
      </div>
    );
  }

  return children;
};

