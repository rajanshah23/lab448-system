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

const FrontDeskDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/front-desk").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const today = data?.today_stats || {};
  const month = data?.current_month_stats || {};
  const recent = data?.recent_repairs || [];
  const pending = data?.pending_payments || [];

  return (
    <div className="content dashboard-front-desk">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>📋 Front Desk Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Customer intake, deliveries, and payments
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
          icon="📥"
          label="New Intakes Today"
          value={today.new_intakes ?? "..."}
          gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="📦"
          label="Pending Deliveries"
          value={today.pending_deliveries ?? "..."}
          gradient={["rgba(251, 146, 60, 0.25)", "rgba(251, 191, 36, 0.2)"]}
        />
        <StatCard
          icon="👥"
          label="Customers Served"
          value={today.total_customers_served ?? "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
        <StatCard
          icon="💰"
          label="Month Revenue"
          value={month.revenue_collected != null ? `₹${Number(month.revenue_collected).toFixed(2)}` : "..."}
          gradient={["rgba(124, 92, 255, 0.25)", "rgba(96, 165, 250, 0.2)"]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Recent Repairs
          </h3>
          {recent.length === 0 ? (
            <p className="muted">No recent repairs</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Customer</th>
                  <th>Device</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.qrToken}</code></td>
                    <td>{r.customer?.name}</td>
                    <td>{r.device?.brand} {r.device?.model}</td>
                    <td>
                      <Link to={`/repairs/${r.id}`} className="btn btn-ghost">Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Pending Payments
          </h3>
          {pending.length === 0 ? (
            <p className="muted">No pending payments</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Repair</th>
                  <th>Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.qrToken}</code></td>
                    <td>₹{Number(r.due || 0).toFixed(2)}</td>
                    <td>
                      <Link to={`/repairs/${r.id}/billing`} className="btn btn-primary">Collect</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/intake" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary">📥 New Intake</button>
          </Link>
          <Link to="/qr-scan" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost">📷 Scan QR</button>
          </Link>
          <Link to="/queue?status=REPAIRED,UNREPAIRABLE" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost">📦 Deliveries</button>
          </Link>
          <Link to="/customers" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost">👤 Customers</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FrontDeskDashboard;
