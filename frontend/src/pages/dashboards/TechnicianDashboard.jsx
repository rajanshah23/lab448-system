import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/apiClient.js";
import { useAuth } from "../../state/AuthContext.jsx";

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
      <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.9 }}>
        {icon}
      </div>
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

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/technician").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const stats = data?.current_month_stats || {};
  const activeRepairs = data?.my_active_repairs || [];
  const trend = data?.performance_trend || [];

  return (
    <div className="content dashboard-technician">
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>🔧 Technician Dashboard</h2>
          <p className="muted small" style={{ marginTop: "4px" }}>
            Your repair performance and active jobs
          </p>
        </div>
        {user?.technicianLevelDisplay && (
          <span
            className="badge"
            style={{
              background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
              color: "#021018",
              padding: "6px 12px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            🎖️ {user.technicianLevelDisplay} ({user.technicianLevel || "—"})
          </span>
        )}
        {user?.commissionRate != null && user.roleCode === "TECHNICIAN" && (
          <span className="muted small">💰 Commission: {(Number(user.commissionRate) * 100).toFixed(0)}%</span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          icon="✅"
          label="Completed This Month"
          value={stats.total_repairs_completed ?? "..."}
          gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="💰"
          label="Earnings"
          value={stats.total_earnings != null ? `₹${Number(stats.total_earnings).toFixed(2)}` : "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
        <StatCard
          icon="⏱️"
          label="Avg Completion (hrs)"
          value={stats.average_completion_time_hours ?? "—"}
          gradient={["rgba(251, 146, 60, 0.25)", "rgba(251, 191, 36, 0.2)"]}
        />
        <StatCard
          icon="🔩"
          label="In Progress"
          value={stats.repairs_in_progress ?? "..."}
          gradient={["rgba(124, 92, 255, 0.25)", "rgba(96, 165, 250, 0.2)"]}
        />
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
          My Active Repairs
        </h3>
        {activeRepairs.length === 0 ? (
          <p className="muted">No repairs in progress. Check the queue for new assignments.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>QR</th>
                <th>Customer</th>
                <th>Device</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeRepairs.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.qrToken}</code></td>
                  <td>{r.customer?.name}</td>
                  <td>{r.device?.brand} {r.device?.model}</td>
                  <td>{r.status}</td>
                  <td>
                    <Link to={`/repairs/${r.id}`} className="btn btn-ghost">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {trend.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Performance Trend (Last 6 Months)
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {trend.map(({ month, repairsCompleted }) => (
              <div
                key={month}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "8px",
                  minWidth: "100px",
                }}
              >
                <div className="small muted">{month}</div>
                <div style={{ fontWeight: 700 }}>{repairsCompleted} repairs</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/queue?status=TO_REPAIR,IN_REPAIR" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary">🔧 View Queue</button>
          </Link>
          <Link to="/qr-scan" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost">📷 Scan QR</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
