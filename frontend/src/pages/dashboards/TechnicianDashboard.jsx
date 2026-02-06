import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      padding: "20px",
      borderRadius: "12px"
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

const TechnicianDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  // Permission checks
  const isTechnicianUser = hasRole('TECHNICIAN') || hasRole('ADMIN');
  const canViewRepairDetails = isTechnicianUser;
  const canUpdateRepairStatus = isTechnicianUser;
  const canManageWorkQueue = isTechnicianUser;
  const canUpdateDiagnosis = isTechnicianUser;
  const canViewPerformanceMetrics = isTechnicianUser;

  useEffect(() => {
    if (!isTechnicianUser) {
      setError("Access denied. You need TECHNICIAN role to access this dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    api.get("/dashboard/technician")
      .then((r) => {
        setData(r.data);
        setError("");
      })
      .catch((err) => {
        console.error("Dashboard error:", err);
        if (err.response?.status === 403) {
          setError("Permission denied. Contact your administrator.");
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
  }, [isTechnicianUser, navigate]);

  // Safe data extraction — backend returns current_month_stats, my_active_repairs, performance_trend
  const current = data?.current_month_stats ?? {};
  const trend = data?.performance_trend ?? [];
  const assigned = Array.isArray(data?.my_active_repairs) ? data.my_active_repairs : [];
  const pending = Array.isArray(data?.pending_repairs) ? data.pending_repairs : [];

  if (!isTechnicianUser) {
    return (
      <div className="content" style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px", opacity: 0.3 }}>🚫</div>
        <h2 style={{ marginBottom: "12px" }}>Access Restricted</h2>
        <p className="muted" style={{ maxWidth: "500px", margin: "0 auto 24px" }}>
          This dashboard is only available to users with <strong>TECHNICIAN</strong> role.
        </p>
        <p className="small muted" style={{ marginBottom: "32px" }}>
          Your current role: <strong>{user?.roleName ?? 'Unknown'}</strong>
        </p>
        <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
          Go to Main Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="content dashboard-technician">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>🔧 Technician Dashboard</h2>
        <div className="small muted" style={{ marginTop: "4px" }}>
          Welcome, <strong>{user?.name ?? 'Technician'}</strong> ({user?.roleName ?? 'N/A'})
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "10px",
          color: "#f87171",
          marginBottom: "16px",
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div className="spinner" style={{ 
            width: "40px", height: "40px", border: "4px solid #f3f4f6", 
            borderTop: "4px solid #3b82f6", borderRadius: "50%", margin: "0 auto 16px" 
          }}></div>
          <div className="muted">Loading dashboard data...</div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <StatCard icon="📋" label="Assigned" value={assigned.length ?? 0} gradient={["#10b981", "#059669"]} />
            <StatCard icon="⏳" label="In Progress" value={current.repairs_in_progress ?? 0} gradient={["#f59e0b", "#d97706"]} />
            <StatCard icon="✅" label="Completed (month)" value={current.total_repairs_completed ?? 0} gradient={["#3b82f6", "#2563eb"]} />
            <StatCard 
               icon="⏱️" 
               label="Avg completion (hrs)" 
               value={current.average_completion_time_hours !== undefined ? `${current.average_completion_time_hours}` : "N/A"} 
               gradient={["#8b5cf6", "#7c3aed"]} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginTop: "24px" }}>
            <div className="card">
              <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Assigned Repairs</h3>
              {assigned.length === 0 ? <p className="muted">No assigned repairs</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", textAlign: "left" }}>
                    <thead>
                      <tr><th>QR</th><th>Device</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {assigned.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ fontFamily: 'monospace' }}>{r.qrToken || r.id}</code>
                            <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(r.qrToken || r.id); alert('Copied ' + (r.qrToken || r.id)); }}>Copy</button>
                          </td>
                          <td>{r.device?.brand} {r.device?.model}</td>
                          <td>
                            <span style={{ 
                              padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                              background: r.status === 'IN_PROGRESS' ? "#ffedd5" : "#dcfce7",
                              color: r.status === 'IN_PROGRESS' ? "#9a3412" : "#166534"
                            }}>
                              {r.status || 'UNKNOWN'}
                            </span>
                          </td>
                          <td>
                            {canViewRepairDetails && (
                              <Link to={`/repairs/${r.id}`} className="btn btn-ghost" style={{ fontSize: "12px" }}>Open</Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>Pending Repairs</h3>
              {pending.length === 0 ? <p className="muted">No pending repairs</p> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", textAlign: "left" }}>
                    <thead>
                      <tr><th>QR</th><th>Issue</th><th>Priority</th><th></th></tr>
                    </thead>
                    <tbody>
                      {pending.slice(0, 10).map((r) => (
                        <tr key={r.id}>
                          <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <code style={{ fontFamily: 'monospace' }}>{r.qrToken || r.id}</code>
                            <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(r.qrToken || r.id); alert('Copied ' + (r.qrToken || r.id)); }}>Copy</button>
                          </td>
                          <td>{r.issue || "N/A"}</td>
                          <td>
                            <span style={{ 
                              padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
                              background: r.priority === 'HIGH' ? "#fee2e2" : "#ffedd5",
                              color: r.priority === 'HIGH' ? "#991b1b" : "#9a3412"
                            }}>
                              {r.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td>
                            {canUpdateRepairStatus && (
                              <Link to={`/repairs/${r.id}`} className="btn btn-primary" style={{ fontSize: "12px" }}>Start</Link>
                            )}
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
            <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Quick Actions</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {canManageWorkQueue && <Link to="/queue" className="btn btn-primary">📋 Work Queue</Link>}
              {canUpdateDiagnosis && <Link to="/repairs" className="btn btn-ghost">🔍 View All Repairs</Link>}
              {canViewPerformanceMetrics && <Link to="/technician/performance" className="btn btn-ghost">📊 Performance</Link>}
            </div>
          </div>

          {canViewPerformanceMetrics && (
            <div className="card" style={{ marginTop: "24px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>📊 Performance Metrics</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
                <div style={{ padding: "12px", background: "#081f4d", borderRadius: "8px" }}>
                  <div className="small muted">Total Completed</div>
                  <div style={{ fontSize: "24px", fontWeight: 700 }}>{current.total_repairs_completed ?? 0}</div>
                </div>
                <div style={{ padding: "12px", background: "#081f4d", borderRadius: "8px" }}>
                  <div className="small muted">Avg Completion Time</div>
                  <div style={{ fontSize: "24px", fontWeight: 700 }}>{current.average_completion_time_hours !== undefined ? `${current.average_completion_time_hours}h` : "N/A"}</div>
                </div>
                <div style={{ padding: "12px", background: "#081f4d", borderRadius: "8px" }}>
                  <div className="small muted">Success Rate</div>
                  <div style={{ fontSize: "24px", fontWeight: 700 }}>
                    {data?.success_rate ? `${Number(data.success_rate).toFixed(1)}%` : "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <style>{`
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        table { border-collapse: collapse; }
        th, td { padding: 14px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        td > code { font-family: monospace; font-size: 13px; }
        /* Use the global .card styles from styles.css (dark themed) so Technician cards match app default */
      `}</style>
    </div>
  );
};

export default TechnicianDashboard;