import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

const PrintIcon = ({ size = 20, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const RepairWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [repair, setRepair] = useState(null);
  const [itemKey, setItemKey] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lookupItem, setLookupItem] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [invError, setInvError] = useState("");
  const qrPrintRef = useRef(null);

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
    const res = await api.get(`/repairs/${id}`);
    setRepair(res.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const doLookup = async () => {
    const key = (itemKey || "").toString().trim();
    if (!key) {
      setLookupItem(null);
      setLookupError("");
      return;
    }
    setLookupError("");
    setLookupItem(null);
    try {
      const res = await api.get("/inventory/lookup", { params: { key } });
      setLookupItem(res.data);
    } catch {
      setLookupItem(null);
      setLookupError("Item not found");
    }
  };

  useEffect(() => {
    const t = setTimeout(doLookup, 400);
    return () => clearTimeout(t);
  }, [itemKey]);

  const transitionTo = async (newStatus) => {
    setStatusError("");
    try {
      await api.post(`/repairs/${id}/transition`, { newStatus });
      await load();
      if (newStatus === REPAIR_STATUS.REPAIRED) {
        navigate(`/repairs/${id}/billing`);
      }
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to change status");
    }
  };

  const addInventoryUsage = async () => {
    setInvError("");
    const key = (itemKey || "").toString().trim();
    if (!key) {
      setInvError("Enter item ID or SKU");
      return;
    }
    try {
      await api.post(`/repairs/${id}/use-inventory`, {
        itemKey: key,
        quantity: Number(quantity) || 1,
      });
      setItemKey("");
      setQuantity(1);
      setLookupItem(null);
      setLookupError("");
      await load();
    } catch (err) {
      setInvError(err.response?.data?.message || "Failed to use inventory");
    }
  };

  if (!repair) {
    return (
      <div className="content">
        <p className="muted">Loading repair...</p>
      </div>
    );
  }

  const nextActions = [];
  if (repair.status === REPAIR_STATUS.IN_REPAIR) {
    nextActions.push({ label: "Mark as repaired", status: REPAIR_STATUS.REPAIRED });
    nextActions.push({ label: "Mark as unrepairable", status: REPAIR_STATUS.UNREPAIRABLE });
  } else if (repair.status === REPAIR_STATUS.REPAIRED || repair.status === REPAIR_STATUS.UNREPAIRABLE) {
    nextActions.push({ label: "Mark as delivered", status: REPAIR_STATUS.DELIVERED });
  }

  const deviceIssue = repair.device?.description?.trim() || "—";

  return (
    <div className="content">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
            🔧 Repair dashboard
          </h2>
          <p className="muted small" style={{ marginTop: "4px" }}>
            {repair.customer?.name} · {repair.device?.brand} {repair.device?.model}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/repairs/${id}/billing`)}
          className="btn btn-primary"
          style={{ padding: "10px 20px", fontSize: "14px", fontWeight: 600 }}
        >
          💳 Billing & payment
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            👤 Customer
          </h3>
          <div style={{ fontSize: "15px", fontWeight: 500 }}>{repair.customer?.name}</div>
          <div className="small muted" style={{ marginTop: "4px" }}>
            {repair.customer?.phone}
            {repair.customer?.email ? ` · ${repair.customer.email}` : ""}
          </div>
          <div className="small muted" style={{ marginTop: "10px" }}>
            QR: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{repair.qrToken}</span>
          </div>
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "#fff", padding: "6px", borderRadius: "8px", display: "inline-block" }}>
              <QRCodeSVG value={repair.qrToken} size={100} level="M" />
            </div>
            <button
              type="button"
              onClick={() => printQrContent(qrPrintRef)}
              title="Print QR"
              className="btn btn-ghost"
              style={{ padding: "6px" }}
            >
              <PrintIcon size={18} />
            </button>
          </div>
          <div ref={qrPrintRef} style={{ display: "none" }}>
            <div style={{ background: "#fff", padding: "8px", display: "inline-block" }}>
              <QRCodeSVG value={repair.qrToken} size={140} level="M" />
            </div>
            <span className="small" style={{ display: "block", marginTop: "8px", fontFamily: "monospace" }}>{repair.qrToken}</span>
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            📱 Device
          </h3>
          <div style={{ fontSize: "15px", fontWeight: 500 }}>
            {repair.device?.brand} {repair.device?.model}
          </div>
          <div className="small muted" style={{ marginTop: "4px" }}>
            Serial: {repair.device?.serialNumber || "—"}
          </div>
          <div style={{ marginTop: "12px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="small muted" style={{ marginBottom: "4px" }}>Issue</div>
            <div style={{ fontSize: "14px", color: "var(--text)", whiteSpace: "pre-wrap" }}>
              {deviceIssue}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            Status
          </h3>
          <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", fontSize: "13px", fontWeight: 500 }}>
            {repair.status.replace("_", " ")}
          </div>
          {statusError && (
            <div className="small" style={{ color: "#f87171", marginTop: "8px" }}>{statusError}</div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
            {nextActions.map((a) => (
              <button
                key={a.status}
                type="button"
                onClick={() => transitionTo(a.status)}
                className="btn btn-primary"
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "18px" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
          📦 Inventory usage
        </h3>
        {hasPermission(PERMISSIONS.USE_INVENTORY) && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px", marginBottom: "16px" }}>
            <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Item key or ID
              </label>
              <input
                type="text"
                value={itemKey}
                onChange={(e) => setItemKey(e.target.value)}
                placeholder="Enter item ID or SKU"
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
                autoComplete="off"
              />
              {lookupItem && (
                <div className="small" style={{ marginTop: "6px", color: "var(--accent)" }}>
                  ✓ {lookupItem.name} · stock {lookupItem.quantity} · ₹{Number(lookupItem.unitPrice).toFixed(2)}
                </div>
              )}
              {lookupError && itemKey.trim() && (
                <div className="small" style={{ marginTop: "6px", color: "#f87171" }}>{lookupError}</div>
              )}
            </div>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>Qty</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                style={{ width: "72px", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}
              />
            </div>
            <button
              type="button"
              onClick={addInventoryUsage}
              className="btn btn-primary"
              style={{ padding: "10px 18px", fontSize: "14px" }}
            >
              Add item
            </button>
          </div>
        )}
        {invError && (
          <div className="small" style={{ color: "#f87171", marginBottom: "12px" }}>{invError}</div>
        )}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <th className="small muted" style={{ textAlign: "left", padding: "10px 8px", fontWeight: 600 }}>When</th>
                <th className="small muted" style={{ textAlign: "left", padding: "10px 8px", fontWeight: 600 }}>Item</th>
                <th className="small muted" style={{ textAlign: "left", padding: "10px 8px", fontWeight: 600 }}>Qty</th>
                <th className="small muted" style={{ textAlign: "right", padding: "10px 8px", fontWeight: 600 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(repair.inventoryUsage || []).map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "10px 8px" }}>{new Date(u.createdAt).toLocaleString()}</td>
                  <td style={{ padding: "10px 8px" }}>{u.inventory?.name ?? "—"}</td>
                  <td style={{ padding: "10px 8px" }}>{u.quantityUsed}</td>
                  <td style={{ padding: "10px 8px", textAlign: "right" }}>
                    ₹{(Number(u.unitPriceAtUse) * u.quantityUsed).toFixed(2)}
                  </td>
                </tr>
              ))}
              {(repair.inventoryUsage || []).length === 0 && (
                <tr>
                  <td colSpan={4} className="small muted" style={{ padding: "20px", textAlign: "center" }}>
                    No inventory used yet.
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

export default RepairWorkspacePage;
