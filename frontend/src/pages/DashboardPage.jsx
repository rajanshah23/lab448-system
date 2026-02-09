import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../utils/apiClient.js";

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
      <div
        style={{
          fontSize: "32px",
          marginBottom: "12px",
          opacity: 0.9,
        }}
      >
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
      <div
        style={{
          marginTop: "8px",
          fontSize: "28px",
          fontWeight: 700,
          color: "#fff",
        }}
      >
        {value}
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        top: "-20px",
        right: "-20px",
        fontSize: "120px",
        opacity: 0.1,
      }}
    >
      {icon}
    </div>
  </div>
);

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          Dashboard
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Overview of your repair shop performance
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          icon="🔧"
          label="Total Repairs"
          value={summary ? summary.totalRepairs : "..."}
          gradient={["rgba(124, 92, 255, 0.2)", "rgba(96, 165, 250, 0.2)"]}
        />
        <StatCard
          icon="⚙️"
          label="Open Repairs"
          value={summary ? summary.openRepairs : "..."}
          gradient={["rgba(251, 146, 60, 0.2)", "rgba(251, 191, 36, 0.2)"]}
        />
        <StatCard
          icon="💰"
          label="Total Revenue"
          value={summary ? `₹${summary.totalRevenue.toFixed(2)}` : "₹0.00"}
          gradient={["rgba(34, 197, 94, 0.2)", "rgba(16, 185, 129, 0.2)"]}
        />
        <StatCard
          icon="📈"
          label="Today Revenue"
          value={summary ? `₹${summary.todayRevenue.toFixed(2)}` : "₹0.00"}
          gradient={["rgba(59, 130, 246, 0.2)", "rgba(147, 51, 234, 0.2)"]}
        />
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
          Quick Actions
        </h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link to="/intake" style={{ textDecoration: "none" }}>
            <button className="btn btn-primary" type="button">📥 New Intake</button>
          </Link>
          <Link to="/qr-scan" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost" type="button">📷 Scan QR</button>
          </Link>
          <Link to="/queue" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost" type="button">🔧 View Queue</button>
          </Link>
          <Link to="/inventory" style={{ textDecoration: "none" }}>
            <button className="btn btn-ghost" type="button">📦 Manage Inventory</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

