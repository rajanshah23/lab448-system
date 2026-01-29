import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

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
  const { user, logout, hasPermission } = useAuth();

  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="brand">
          <h1>Lab448 Repair</h1>
          <p>Shop Automation Console</p>
        </div>
        <nav className="nav">
          {hasPermission(PERMISSIONS.VIEW_DASHBOARD) && (
            <NavLink to="/" label="Dashboard" />
          )}
          {hasPermission(PERMISSIONS.INTAKE_REPAIR) && (
            <NavLink to="/intake" label="Intake" />
          )}
          {hasPermission(PERMISSIONS.UPDATE_REPAIR_STATUS) && (
            <NavLink to="/queue" label="To-Repair Queue" />
          )}
          {(hasPermission(PERMISSIONS.UPDATE_REPAIR_STATUS) ||
            hasPermission(PERMISSIONS.MANAGE_BILLING)) && (
            <NavLink to="/qr-scan" label="QR Scan" />
          )}
          {hasPermission(PERMISSIONS.MANAGE_INVENTORY) && (
            <NavLink to="/inventory" label="Inventory" />
          )}
        </nav>

        <div className="user">
          {user && (
            <>
              <div className="font-medium">{user.name}</div>
              <div className="muted">{user.email}</div>
              <div className="muted capitalize">{user.roleName || "Role"}</div>
            </>
          )}
          <div style={{marginTop:10}}>
            <button onClick={logout} className="btn btn-ghost">Sign out</button>
          </div>
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

