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

const FinanceDashboard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard/finance").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const today = data?.today_collections ?? 0;
  const month = data?.current_month || {};
  const recent = data?.recent_payments || [];
  const pending = data?.pending_bills || [];
  const breakdown = month.payment_method_breakdown || {};

  return (
    <div className="content dashboard-finance">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>💰 Finance Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Payments, collections, and financial overview
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          icon="📅"
          label="Today Collections"
          value={typeof today === "number" ? `₹${Number(today).toFixed(2)}` : "..."}
          gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="📊"
          label="Month Revenue"
          value={month.total_revenue != null ? `₹${Number(month.total_revenue).toFixed(2)}` : "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
        <StatCard
          icon="⏳"
          label="Outstanding"
          value={month.outstanding_payments != null ? `₹${Number(month.outstanding_payments).toFixed(2)}` : "..."}
          gradient={["rgba(251, 146, 60, 0.25)", "rgba(251, 191, 36, 0.2)"]}
        />
      </div>

      {Object.keys(breakdown).length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
            Payment Method Breakdown (This Month)
          </h3>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {Object.entries(breakdown).map(([method, amt]) => (
              <div key={method} style={{ padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <span className="small muted">{method.replace(/_/g, " ")}</span>
                <div style={{ fontWeight: 700 }}>₹{Number(amt || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>Recent Payments</h3>
          {recent.length === 0 ? (
            <p className="muted">No recent payments</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Repair</th>
                  <th>Amount</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 15).map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.repair?.qrToken}</code></td>
                    <td>₹{Number(p.amount).toFixed(2)}</td>
                    <td>{p.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>Pending Bills</h3>
          {pending.length === 0 ? (
            <p className="muted">No pending bills</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Repair</th>
                  <th>Customer</th>
                  <th>Due</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 15).map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.qrToken}</code></td>
                    <td>{r.customer?.name}</td>
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
    </div>
  );
};

export default FinanceDashboard;
