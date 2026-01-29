import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";

const QueuePage = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/repairs/queue", {
        params: { status: REPAIR_STATUS.TO_REPAIR },
      });
      setRepairs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const moveToInRepair = async (id) => {
    try {
      await api.post(`/repairs/${id}/transition`, {
        newStatus: REPAIR_STATUS.IN_REPAIR,
      });
      navigate(`/repairs/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          🔧 To-Repair Queue
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Devices waiting to be repaired
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            color: "#f87171",
            fontSize: "14px",
          }}
        >
          ✗ {error}
        </div>
      )}

      <div
        style={{
          background: "linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(96, 165, 250, 0.1))",
          border: "1px solid rgba(124, 92, 255, 0.2)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "28px" }}>⏱️</div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {repairs.length} {repairs.length === 1 ? "Repair" : "Repairs"} Pending
          </div>
          <div className="small muted">
            Click "Start Repair" to begin working on an item
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Customer</th>
                <th>Device</th>
                <th>QR Token</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="small">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                    <div className="small muted">
                      {new Date(r.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{r.customer?.name}</div>
                    <div className="small muted">{r.customer?.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {r.device?.brand} {r.device?.model}
                    </div>
                    {r.device?.serialNumber && (
                      <div className="small muted">{r.device?.serialNumber}</div>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        padding: "4px 8px",
                        background: "rgba(124, 92, 255, 0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#a78bfa",
                      }}
                    >
                      {r.qrToken}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => moveToInRepair(r.id)}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                    >
                      ▶ Start Repair
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && repairs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "48px 20px",
                      color: "var(--muted)",
                    }}
                  >
                    <div style={{ fontSize: "48px", marginBottom: "12px" }}>
                      ✓
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 600 }}>
                      Queue is empty
                    </div>
                    <div className="small" style={{ marginTop: "4px" }}>
                      No repairs waiting to be started
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QueuePage;
