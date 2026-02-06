import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../utils/apiClient.js";

const StatCard = ({ label, value, icon, gradient }) => (
  <div
    className="card"
    style={{
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      border: "none",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div style={{ position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.9 }}>{icon}</div>
      <div
        className="small muted"
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: "8px", fontSize: "28px", fontWeight: 700, color: "#fff" }}>
        {value}
      </div>
    </div>
  </div>
);

const DASHBOARD_SHORTCUTS = [
  { path: "/dashboard/technician", icon: "🔧", label: "Technician View", theme: ["#3b82f6", "#60a5fa"] },
  { path: "/dashboard/front-desk", icon: "📋", label: "Front Desk View", theme: ["#22c55e", "#10b981"] },
  { path: "/dashboard/logistics", icon: "📦", label: "Logistics View", theme: ["#f97316", "#fb923c"] },
  { path: "/dashboard/finance", icon: "💰", label: "Finance View", theme: ["#a855f7", "#c084fc"] },
  { path: "/dashboard/manager", icon: "📊", label: "Manager View", theme: ["#1e40af", "#3b82f6"] },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/admin").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const sys = data?.system_overview || {};
  const users = data?.user_management_summary || {};
  const rolesDist = users.roles_distribution || {};

  return (
    <div className="content dashboard-admin">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>⚙️ Admin Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Full system access — view all role dashboards
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          icon="🔧"
          label="Total Repairs"
          value={sys.total_repairs ?? "..."}
          gradient={["rgba(239, 68, 68, 0.25)", "rgba(248, 113, 113, 0.2)"]}
        />
        <StatCard
          icon="💰"
          label="Total Revenue"
          value={sys.total_revenue != null ? `₹${Number(sys.total_revenue).toFixed(2)}` : "..."}
          gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="👥"
          label="Active Users"
          value={sys.active_users ?? "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 700 }}>
          🎯 Navigate to Role Dashboards
        </h2>
        <p className="muted small" style={{ marginBottom: "16px" }}>
          Admin can access all role-specific views for testing and oversight
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          {DASHBOARD_SHORTCUTS.map((d) => (
            <button
              key={d.path}
              type="button"
              className="card"
              onClick={() => navigate(d.path)}
              style={{
                cursor: "pointer",
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.06)",
                transition: "all 180ms ease",
                background: `linear-gradient(135deg, ${d.theme[0]}22, ${d.theme[1]}18)`,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>{d.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>{d.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Roles Distribution
          </h3>
          {Object.keys(rolesDist).length === 0 ? (
            <p className="muted">No data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(rolesDist).map(([role, count]) => (
                <div key={role} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{role}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Configuration
          </h3>
          <div className="muted small">
            Roles configured: {data?.configuration_status?.roles_configured ?? "—"}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/users")}
          >
            👥 User Management
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/inventory")}
          >
            📦 Inventory
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate("/queue")}
          >
            🔧 Queue
          </button>
        </div>
      </div>
    </div>
  );
};



// // for checking  if the ui is working or not, we will show this message. once the ui is ready, we will remove this message and show the actual dashboard.
// const AdminDashboard = () => {
//   return  <div>Admin Dashboard is under maintenance.</div>;
// };
export default AdminDashboard;
