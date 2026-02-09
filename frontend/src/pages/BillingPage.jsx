import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../utils/apiClient.js";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

const BillingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [billing, setBilling] = useState(null);
  const [repair, setRepair] = useState(null);
  const [newCharge, setNewCharge] = useState({ description: "", amount: 0 });
  const [payment, setPayment] = useState({ amount: 0, method: "CASH" });
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const load = async () => {
    const [billingRes, repairRes] = await Promise.all([
      api.get(`/repairs/${id}/billing`),
      api.get(`/repairs/${id}`),
    ]);
    setBilling(billingRes.data);
    setRepair(repairRes.data);
  };

  useEffect(() => {
    load();
  }, [id]);

  const addCharge = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/repairs/${id}/add-charge`, {
        type: "OTHER",
        description: newCharge.description,
        amount: Number(newCharge.amount),
      });
      setNewCharge({ description: "", amount: 0 });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add charge");
    }
  };

  const recordPayment = async (e) => {
    e.preventDefault();
    setPaymentError("");
    try {
      await api.post(`/repairs/${id}/pay`, {
        amount: Number(payment.amount),
        method: payment.method,
      });
      setPayment({ amount: 0, method: "CASH" });
      await load();
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to record payment");
    }
  };

  if (!billing || !repair) {
    return (
      <div className="content">
        <p className="muted">Loading billing...</p>
      </div>
    );
  }

  const remaining = billing.due;
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" };

  return (
    <div className="content">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
            💳 Billing & payment
          </h2>
          <p className="muted small" style={{ marginTop: "4px" }}>
            {repair.customer?.name} · {repair.device?.brand} {repair.device?.model}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/repairs/${id}`)}
          className="btn btn-ghost"
          style={{ padding: "10px 20px", fontSize: "14px" }}
        >
          ← Back to repair dashboard
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            Bill summary
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Total charges</span>
              <span>₹{billing.total.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Paid</span>
              <span>₹{billing.paid.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginTop: "4px" }}>
              <span className="muted">Due</span>
              <span>₹{billing.due.toFixed(2)}</span>
            </div>
          </div>
          <div className="small muted" style={{ marginTop: "14px" }}>
            Staff share (when fully paid): ₹{Number(repair.staffShareAmount).toFixed(2)} · Shop: ₹{Number(repair.shopShareAmount).toFixed(2)}
          </div>
          <div className="small muted" style={{ marginTop: "6px" }}>
            Status: <strong style={{ color: "var(--text)" }}>{billing.isLocked ? "Locked" : "Open"}</strong>
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            Charges
          </h3>
          {hasPermission(PERMISSIONS.MANAGE_BILLING) && !billing.isLocked && (
            <form onSubmit={addCharge} style={{ marginBottom: "16px" }}>
              <div style={{ marginBottom: "10px" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>Description</label>
                <input
                  style={inputStyle}
                  value={newCharge.description}
                  onChange={(e) => setNewCharge((c) => ({ ...c, description: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>Amount (₹)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    style={inputStyle}
                    value={newCharge.amount}
                    onChange={(e) => setNewCharge((c) => ({ ...c, amount: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: "10px 16px" }}>
                  Add charge
                </button>
              </div>
              {error && <div className="small" style={{ color: "#f87171", marginTop: "8px" }}>{error}</div>}
            </form>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", maxHeight: "260px", overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="small muted" style={{ textAlign: "left", padding: "8px", fontWeight: 600 }}>When</th>
                  <th className="small muted" style={{ textAlign: "left", padding: "8px", fontWeight: 600 }}>Description</th>
                  <th className="small muted" style={{ textAlign: "right", padding: "8px", fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.charges.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px" }}>{new Date(c.createdAt).toLocaleString()}</td>
                    <td style={{ padding: "8px" }}>{c.type} · {c.description}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>₹{Number(c.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {billing.charges.length === 0 && (
                  <tr>
                    <td colSpan={3} className="small muted" style={{ padding: "16px", textAlign: "center" }}>No charges yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: "18px" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
            Payments
          </h3>
          {hasPermission(PERMISSIONS.TAKE_PAYMENT) && !billing.isLocked && (
            <form onSubmit={recordPayment} style={{ marginBottom: "16px" }}>
              <div style={{ marginBottom: "10px" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  max={remaining}
                  step="0.01"
                  style={inputStyle}
                  value={payment.amount}
                  onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>Method</label>
                <select style={inputStyle} value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: "10px 18px" }}>
                Record payment
              </button>
              {paymentError && <div className="small" style={{ color: "#f87171", marginTop: "8px" }}>{paymentError}</div>}
            </form>
          )}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px", maxHeight: "260px", overflowY: "auto" }}>
            <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="small muted" style={{ textAlign: "left", padding: "8px", fontWeight: 600 }}>When</th>
                  <th className="small muted" style={{ textAlign: "left", padding: "8px", fontWeight: 600 }}>Method</th>
                  <th className="small muted" style={{ textAlign: "right", padding: "8px", fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "8px" }}>{new Date(p.receivedAt).toLocaleString()}</td>
                    <td style={{ padding: "8px" }}>{p.method}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>₹{Number(p.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {billing.payments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="small muted" style={{ padding: "16px", textAlign: "center" }}>No payments yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
