import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../utils/apiClient.js";
import { validatePhone, validateEmail } from "../utils/validation.js";
import { REPAIR_STATUS } from "../constants/statuses.js";

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

const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", phone2: "", email: "", address: "" });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get(`/customers/${id}`)
      .then((res) => {
        if (!cancelled) setCustomer(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const startEdit = useCallback(() => {
    if (!customer) return;
    setEditForm({
      name: customer.name || "",
      phone: customer.phone || "",
      phone2: customer.phone2 || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setEditErrors({});
    setSaveError("");
    setEditing(true);
  }, [customer]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditErrors({});
    setSaveError("");
  }, []);

  const updateEdit = (field) => (e) => {
    const v = e.target.value;
    if ((field === "phone" || field === "phone2") && v !== "" && !/^\d*$/.test(v)) return;
    setEditForm((f) => ({ ...f, [field]: v }));
    setEditErrors((err) => ({ ...err, [field]: undefined }));
  };

  const handleSave = async () => {
    const errors = {};
    if (!editForm.name.trim()) errors.name = "Name is required";
    const phoneFilled = (editForm.phone != null && String(editForm.phone).trim() !== "");
    if (!phoneFilled) {
      errors.phone = "Please fill your primary phone number";
    } else {
      const r = validatePhone(editForm.phone);
      if (!r.valid) errors.phone = r.message;
    }
    const phone2Filled = (editForm.phone2 != null && String(editForm.phone2).trim() !== "");
    if (phone2Filled) {
      const r = validatePhone(editForm.phone2);
      if (!r.valid) errors.phone2 = r.message;
    }
    const emailResult = validateEmail(editForm.email);
    if (!emailResult.valid) errors.email = emailResult.message;
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSaveError("");
    try {
      const res = await api.put(`/customers/${id}`, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        phone2: editForm.phone2.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
      });
      setCustomer(res.data);
      setEditing(false);
      setEditErrors({});
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="content"><p className="muted">Loading customer...</p></div>;
  if (error || !customer) {
    return (
      <div className="content">
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "10px", color: "#f87171" }}>
          ✗ {error || "Customer not found"}
        </div>
        <button type="button" className="btn" style={{ marginTop: "12px" }} onClick={() => navigate("/customers")}>
          Back to customers
        </button>
      </div>
    );
  }

  const repairs = (customer.repairs || []).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className="content">
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/customers")}>
          ← Customers
        </button>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(96, 165, 250, 0.1))",
          border: "1px solid rgba(124, 92, 255, 0.2)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        {!editing ? (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700 }}>
                {customer.name}
              </h2>
              <button type="button" className="btn btn-primary" onClick={startEdit} style={{ fontSize: "13px", padding: "8px 16px" }}>
                Edit customer
              </button>
            </div>
            <div className="small muted" style={{ marginBottom: "4px" }}>
              Phone: {customer.phone || "—"}
            </div>
            {customer.phone2 && (
              <div className="small muted" style={{ marginBottom: "4px" }}>
                Another number: {customer.phone2}
              </div>
            )}
            <div className="small muted" style={{ marginBottom: "4px" }}>
              Email: {customer.email || "—"}
            </div>
            {customer.address && (
              <div className="small muted">Address: {customer.address}</div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 600 }}>Edit customer</h3>
            {saveError && (
              <div className="small" style={{ color: "#f87171", marginBottom: "4px" }}>{saveError}</div>
            )}
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={updateEdit("name")}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${editErrors.name ? "#f87171" : "var(--border)"}`, background: "var(--panel)", color: "var(--text)" }}
                placeholder="Full name"
              />
              {editErrors.name && <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{editErrors.name}</div>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ flex: "1 1 180px" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Primary phone (10 digits) *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={editForm.phone}
                  onChange={updateEdit("phone")}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${editErrors.phone ? "#f87171" : "var(--border)"}`, background: "var(--panel)", color: "var(--text)" }}
                  placeholder="9876543210"
                />
                {editErrors.phone && <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{editErrors.phone}</div>}
              </div>
              <div style={{ flex: "1 1 180px" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Another number (10 digits)</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={editForm.phone2}
                  onChange={updateEdit("phone2")}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${editErrors.phone2 ? "#f87171" : "var(--border)"}`, background: "var(--panel)", color: "var(--text)" }}
                  placeholder="Optional"
                />
                {editErrors.phone2 && <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{editErrors.phone2}</div>}
              </div>
            </div>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={updateEdit("email")}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${editErrors.email ? "#f87171" : "var(--border)"}`, background: "var(--panel)", color: "var(--text)" }}
                placeholder="email@example.com"
              />
              {editErrors.email && <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{editErrors.email}</div>}
            </div>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Address</label>
              <textarea
                rows={2}
                value={editForm.address}
                onChange={updateEdit("address")}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", resize: "vertical" }}
                placeholder="Address (optional)"
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" className="btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>
        Previous repairs ({repairs.length})
      </h3>
      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Device</th>
                <th>QR Token</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => (
                <tr key={r.id}>
                  <td className="small">
                    {new Date(r.createdAt).toLocaleDateString()}
                    <div className="muted small">{new Date(r.createdAt).toLocaleTimeString()}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {r.device?.brand} {r.device?.model}
                    </div>
                    {r.device?.serialNumber && (
                      <div className="muted small">S/N: {r.device.serialNumber}</div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)" }}>
                      {r.qrToken}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
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
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/repairs/${r.id}`)}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                    >
                      Open repair
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/repairs/${r.id}/billing`)}
                      className="btn"
                      style={{ fontSize: "12px", padding: "8px 16px", marginLeft: "8px" }}
                    >
                      Billing
                    </button>
                  </td>
                </tr>
              ))}
              {repairs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No repairs yet. Create one via Intake.
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

export default CustomerDetailPage;
