import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

const ManagerDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/manager").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const ops = data?.operations_overview || {};
  const metrics = data?.performance_metrics || {};
  const statusDist = ops.status_distribution || {};
  const staffUtil = ops.staff_utilization || [];
  const bottlenecks = data?.bottlenecks || [];

  return (
    <div className="content dashboard-manager">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>📊 Manager Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Operations overview and performance
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
          label="Active Repairs"
          value={ops.active_repairs ?? "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
        <StatCard
          icon="✅"
          label="Completed This Month"
          value={metrics.month_completed ?? "..."}
          gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="⚠️"
          label="Bottlenecks"
          value={bottlenecks.length}
          gradient={bottlenecks.length > 0 ? ["rgba(239, 68, 68, 0.25)", "rgba(248, 113, 113, 0.2)"] : ["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Status Distribution
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {Object.entries(statusDist).map(([status, count]) => (
              <div key={status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Staff Utilization
          </h3>
          {staffUtil.length === 0 ? (
            <p className="muted">No technician data</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Assigned</th>
                  <th>In Progress</th>
                </tr>
              </thead>
              <tbody>
                {staffUtil.map((s) => (
                  <tr key={s.technicianId}>
                    <td>{s.technicianName}</td>
                    <td>{s.assignedCount}</td>
                    <td>{s.inProgressCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {bottlenecks.length > 0 && (
        <div className="card" style={{ marginTop: "24px", borderLeft: "4px solid #ef4444" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600, color: "#f87171" }}>
            ⚠️ Stuck Repairs (&gt;48h)
          </h3>
          <table>
            <thead>
              <tr>
                <th>QR</th>
                <th>Customer</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bottlenecks.map((r) => (
                <tr key={r.id}>
                  <td><code>{r.qrToken}</code></td>
                  <td>{r.customer?.name}</td>
                  <td>{r.status}</td>
                  <td>
                    <Link to={`/repairs/${r.id}`} className="btn btn-ghost">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/queue" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary">🔧 Queue</button>
          </Link>
          <Link to="/users" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost">👥 Users</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
