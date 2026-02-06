import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";

const PrintIcon = ({ size = 20, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const ALL_STATUSES = [
  REPAIR_STATUS.INTAKE,
  REPAIR_STATUS.TO_REPAIR,
  REPAIR_STATUS.IN_REPAIR,
  REPAIR_STATUS.REPAIRED,
  REPAIR_STATUS.UNREPAIRABLE,
  REPAIR_STATUS.DELIVERED,
];

const STATUS_LABELS = {
  [REPAIR_STATUS.INTAKE]: "Intake",
  [REPAIR_STATUS.TO_REPAIR]: "To Repair",
  [REPAIR_STATUS.IN_REPAIR]: "In Repair",
  [REPAIR_STATUS.REPAIRED]: "Repaired",
  [REPAIR_STATUS.UNREPAIRABLE]: "Unrepairable",
  [REPAIR_STATUS.DELIVERED]: "Delivered",
};

const STATUS_COLORS = {
  [REPAIR_STATUS.INTAKE]: "rgba(96, 165, 250, 0.2)",
  [REPAIR_STATUS.TO_REPAIR]: "rgba(124, 92, 255, 0.2)",
  [REPAIR_STATUS.IN_REPAIR]: "rgba(245, 158, 11, 0.2)",
  [REPAIR_STATUS.REPAIRED]: "rgba(34, 197, 94, 0.2)",
  [REPAIR_STATUS.UNREPAIRABLE]: "rgba(239, 68, 68, 0.2)",
  [REPAIR_STATUS.DELIVERED]: "rgba(107, 114, 128, 0.2)",
};

const QueuePage = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrModalToken, setQrModalToken] = useState(null);
  const qrModalPrintRef = useRef(null);
  const navigate = useNavigate();



  const printQrContent = (ref) => {
    if (!ref?.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>QR Code</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;background:#fff;}.token{font-family:monospace;margin-top:12px;font-size:14px;color:#333;}</style></head><body>${ref.current.innerHTML}</body></html>`
    );
    win.document.close();
    win.onload = () => {
      win.print();
      win.close();
    };
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/repairs/queue", {
        params: { status: ALL_STATUSES.join(",") },
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

  const moveToToRepair = async (id) => {
    try {
      await api.post(`/repairs/${id}/transition`, {
        newStatus: REPAIR_STATUS.TO_REPAIR,
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

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
          🔧 Queue
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          All repairs by status — intake, to-repair, in-repair, and more
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
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ fontSize: "28px" }}>📋</div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>
              {repairs.length} {repairs.length === 1 ? "Repair" : "Repairs"}
            </div>
            <div className="small muted">
              Intake, to-repair, in-repair, repaired, unrepairable, delivered
            </div>
          </div>
        </div>

        <div style={{ minWidth: "200px" }} />
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Created</th>
                <th>Status</th>
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
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        background: STATUS_COLORS[r.status] || "rgba(128,128,128,0.2)",
                        color: "var(--text)",
                      }}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
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
                    <button
                      type="button"
                      onClick={() => setQrModalToken(r.qrToken)}
                      style={{
                        fontFamily: "monospace",
                        padding: "4px 8px",
                        background: "rgba(124, 92, 255, 0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#a78bfa",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                      title="Click to show QR code"
                    >
                      {r.qrToken}
                    </button>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === REPAIR_STATUS.INTAKE && (
                      <button
                        onClick={() => moveToToRepair(r.id)}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "8px 16px" }}
                      >
                        Move to Queue
                      </button>
                    )}
                    {r.status === REPAIR_STATUS.TO_REPAIR && (
                      <button
                        onClick={() => moveToInRepair(r.id)}
                        className="btn btn-primary"
                        style={{ fontSize: "12px", padding: "8px 16px" }}
                      >
                        ▶ Start Repair
                      </button>
                    )}
                    {(r.status === REPAIR_STATUS.IN_REPAIR ||
                      r.status === REPAIR_STATUS.REPAIRED ||
                      r.status === REPAIR_STATUS.UNREPAIRABLE ||
                      r.status === REPAIR_STATUS.DELIVERED) && (
                        <button
                          onClick={() => navigate(`/repairs/${r.id}`)}
                          className="btn"
                          style={{ fontSize: "12px", padding: "8px 16px" }}
                        >
                          View
                        </button>
                      )}
                  </td>
                </tr>
              ))}
              {!loading && repairs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
                      No repairs yet
                    </div>
                    <div className="small" style={{ marginTop: "4px" }}>
                      Create an intake to see repairs here
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {qrModalToken && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setQrModalToken(null)}
        >
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              border: "1px solid rgba(124, 92, 255, 0.3)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", justifyContent: "space-between" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                QR code
              </div>
              <button
                type="button"
                onClick={() => printQrContent(qrModalPrintRef)}
                title="Print QR code"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PrintIcon size={20} style={{ color: "var(--text)" }} />
              </button>
            </div>
            <div ref={qrModalPrintRef} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ background: "#fff", padding: "12px", borderRadius: "8px" }}>
                <QRCodeSVG value={qrModalToken} size={200} level="M" />
              </div>
              <div
                className="token"
                style={{
                  fontFamily: "monospace",
                  fontSize: "13px",
                  color: "var(--muted)",
                  wordBreak: "break-all",
                  marginTop: "8px",
                }}
              >
                {qrModalToken}
              </div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setQrModalToken(null)}
              style={{ marginTop: "8px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default QueuePage;
