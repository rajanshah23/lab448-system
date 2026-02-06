import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS, ROLE_CODES } from "../constants/permissions.js";

const NavLink = ({ to, label }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} className={active ? "active" : ""}>
      {label}
    </Link>
  );
};

export const Layout = ({ children }) => {
  const { user, logout, hasPermission, isAdmin } = useAuth();

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="brand">
          <h1>Lab448 Repair</h1>
          <p>Shop Automation Console</p>
        </div>

        <nav className="nav">
          {isAdmin() && (
            <>
              <div
                className="small muted"
                style={{
                  padding: "8px 12px 4px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Admin Access (All Dashboards)
              </div>
              <NavLink to="/dashboard/admin" label="🎯 Admin Dashboard" />
              <NavLink to="/dashboard/technician" label="🔧 Technician View" />
              <NavLink to="/dashboard/front-desk" label="📋 Front Desk View" />
              <NavLink to="/dashboard/logistics" label="📦 Logistics View" />
              <NavLink to="/dashboard/finance" label="💰 Finance View" />
              <NavLink to="/dashboard/manager" label="📊 Manager View" />
              <NavLink to="/dashboard/billing-payments" label="💳 Billing & Payments" />

            </>
          )}

          {!isAdmin() && hasPermission(PERMISSIONS.VIEW_DASHBOARD) && (
            <NavLink
              to={
                user?.roleCode === ROLE_CODES.TECHNICIAN
                  ? "/dashboard/technician"
                  : user?.roleCode === ROLE_CODES.FRONT_DESK
                  ? "/dashboard/front-desk"
                  : user?.roleCode === ROLE_CODES.LOGISTICS
                  ? "/dashboard/logistics"
                  : user?.roleCode === ROLE_CODES.FINANCE
                  ? "/dashboard/finance"
                  : user?.roleCode === ROLE_CODES.MANAGER
                  ? "/dashboard/manager"
                  : "/"
              }
              label="📊 Dashboard"
            />
          )}

          {hasPermission(PERMISSIONS.INTAKE_REPAIR) && (
            <NavLink to="/intake" label="📥 Intake" />
          )}
          {hasPermission(PERMISSIONS.UPDATE_REPAIR_STATUS) && (
            <NavLink to="/queue" label="🔧 Queue" />
          )}
          {(hasPermission(PERMISSIONS.UPDATE_REPAIR_STATUS) ||
            hasPermission(PERMISSIONS.MANAGE_BILLING)) && (
            <NavLink to="/qr-scan" label="📷 QR Scan" />
          )}
          {hasPermission(PERMISSIONS.MANAGE_INVENTORY) && (
            <NavLink to="/inventory" label="📦 Inventory" />
          )}
          {(hasPermission(PERMISSIONS.VIEW_DASHBOARD) ||
            hasPermission(PERMISSIONS.INTAKE_REPAIR)) && (
            <NavLink to="/customers" label="👤 Customers" />
          )}
          {hasPermission(PERMISSIONS.MANAGE_USERS) && (
            <NavLink to="/users" label="👥 Users" />
          )}
        </nav>

       
       
<div className="user">
  {user && (
    <div className="user-profile">
      <div className="user-top">
        <div className="user-avatar">
          {user.name?.charAt(0)?.toUpperCase()}
        </div>

        <div className="user-info-block">
          <div className="user-name-row">
            <div className="user-name">{user.name}</div>

            {user.roleCode === ROLE_CODES.TECHNICIAN && (
              <div className="user-role-badge">
                Tech Repair Army
              </div>
            )}

            {user.roleCode !== ROLE_CODES.TECHNICIAN && (
              <div className="user-role-badge">
                {user.roleName || "Role"}
              </div>
            )}
          </div>

          <div className="user-email">{user.email}</div>
        </div>
      </div>

      {user.roleCode === ROLE_CODES.TECHNICIAN &&
        user.technicianLevelDisplay && (
          <div className="user-meta">
            🎖️ {user.technicianLevelDisplay}
          </div>
        )}

      {user.roleCode === ROLE_CODES.TECHNICIAN &&
        user.commissionRate != null && (
          <div className="user-meta muted">
            💰 Commission:{" "}
            {(Number(user.commissionRate) * 100).toFixed(0)}%
          </div>
        )}

      {isAdmin() && (
        <div className="admin-access">
          🎯 Full System Access
        </div>
      )}

      <button onClick={logout} className="btn btn-ghost logout-btn">
        Sign out
      </button>
    </div>
  )}
</div>

      </aside>

      <main className="main">
        <header className="header">
          <div className="small muted">{new Date().toLocaleString()}</div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
};
