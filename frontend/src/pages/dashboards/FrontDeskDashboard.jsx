import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../utils/apiClient.js";
import { useAuth } from  "../../state/AuthContext.jsx" ;  

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // Permission checks for frontdesk features
  const isFrontDeskUser = hasRole('FRONT_DESK') || hasRole('ADMIN');
  const canAccessIntake = isFrontDeskUser;
  const canScanQR = isFrontDeskUser;
  const canManageDeliveries = isFrontDeskUser;
  const canViewCustomers = isFrontDeskUser;
  const canCollectPayments = isFrontDeskUser;
  const canViewRepairs = isFrontDeskUser;

  useEffect(() => {
    // Check if user has proper role access
    if (!isFrontDeskUser) {
      setError("Access denied. You need FRONT_DESK role to access this dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get("/dashboard/front-desk")
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        
        if (err.response?.status === 403) {
          setError("Permission denied. Contact your administrator to enable Front Desk access.");
        } else if (err.response?.status === 401) {
          setError("Session expired. Please log in again.");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setError(err.response?.data?.message || "Failed to load dashboard data");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isFrontDeskUser, navigate]);

  const today = data?.today_stats || {};
  const month = data?.current_month_stats || {};
  const recent = data?.recent_repairs || [];
  const pending = data?.pending_payments || [];

  // If user doesn't have FRONT_DESK role
  if (!isFrontDeskUser) {
    return (
      <div className="content" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px", opacity: 0.3 }}>🚫</div>
        <h2 style={{ marginBottom: "12px" }}>Access Restricted</h2>
        <p className="muted" style={{ maxWidth: "500px", margin: "0 auto 24px" }}>
          This dashboard is only available to users with <strong>FRONT_DESK</strong> role.
        </p>
        <p className="small muted" style={{ marginBottom: "32px" }}>
          Your current role: <strong>{user?.roleName || 'Unknown'}</strong>
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
            Go to Main Dashboard
          </button>
          <button onClick={() => navigate("/intake")} className="btn btn-secondary">
            Go to Intake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content dashboard-front-desk">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>📋 Front Desk Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Customer intake, deliveries, and payments
        </p>
        <div className="small muted" style={{ marginTop: "4px" }}>
          Welcome, <strong>{user?.name}</strong> ({user?.roleName})
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            color: "#f87171",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            margin: "0 auto 16px",
            border: "4px solid #f3f4f6",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }}></div>
          <div className="muted">Loading dashboard data...</div>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && data && (
        <>
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
              value={today.new_intakes ?? "0"}
              gradient={["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
            />
            <StatCard
              icon="📦"
              label="Pending Deliveries"
              value={today.pending_deliveries ?? "0"}
              gradient={["rgba(251, 146, 60, 0.25)", "rgba(251, 191, 36, 0.2)"]}
            />
            <StatCard
              icon="👥"
              label="Customers Served"
              value={today.total_customers_served ?? "0"}
              gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
            />
            <StatCard
              icon="💰"
              label="Month Revenue"
              value={month.revenue_collected != null ? `₹${Number(month.revenue_collected).toFixed(2)}` : "₹0.00"}
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
                <div style={{ overflowX: "auto" }}>
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
                          <td><code>{r.qrToken || r.id}</code></td>
                          <td>{r.customer?.name || "N/A"}</td>
                          <td>{r.device?.brand || ""} {r.device?.model || ""}</td>
                          <td>
                            {canViewRepairs ? (
                              <Link to={`/repairs/${r.id}`} className="btn btn-ghost" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                Open
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="card">
              <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
                Pending Payments
              </h3>
              {pending.length === 0 ? (
                <p className="muted">No pending payments</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
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
                          <td><code>{r.qrToken || r.id}</code></td>
                          <td>₹{Number(r.due || 0).toFixed(2)}</td>
                          <td>
                            {canCollectPayments ? (
                              <Link to={`/repairs/${r.id}/billing`} className="btn btn-primary" style={{ fontSize: "12px", padding: "4px 8px" }}>
                                Collect
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: "24px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {canAccessIntake && (
                <Link to="/intake" style={{ textDecoration: "none" }}>
                  <button className="btn btn-primary">📥 New Intake</button>
                </Link>
              )}
              {canScanQR && (
                <Link to="/qr-scan" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost">📷 Scan QR</button>
                </Link>
              )}
              {canManageDeliveries && (
                <Link to="/queue?status=REPAIRED,UNREPAIRABLE" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost">📦 Deliveries</button>
                </Link>
              )}
              {canViewCustomers && (
                <Link to="/customers" style={{ textDecoration: "none" }}>
                  <button className="btn btn-ghost">👤 Customers</button>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Add CSS for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FrontDeskDashboard;