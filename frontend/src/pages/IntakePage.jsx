import React, { useState } from "react";
import { api } from "../utils/apiClient.js";

const IntakePage = () => {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    description: "",
    intakeNotes: "",
    flatChargeAmount: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/repairs/intake", {
        customer: {
          name: form.customerName,
          phone: form.customerPhone || null,
          email: form.customerEmail || null,
        },
        device: {
          brand: form.deviceBrand || null,
          model: form.deviceModel || null,
          serialNumber: form.serialNumber || null,
          description: form.description || null,
        },
        intakeNotes: form.intakeNotes || null,
        flatChargeAmount: Number(form.flatChargeAmount || 0),
      });
      setResult(res.data);
      setForm({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        description: "",
        intakeNotes: "",
        flatChargeAmount: 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Intake failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          📥 New Repair Intake
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Register a new device for repair
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

      {result && (
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ fontSize: "32px" }}>✓</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 600, color: "#4ade80" }}>
                Intake Created Successfully!
              </h3>
              <p className="small" style={{ marginBottom: "12px", color: "var(--text)" }}>
                Device registered for {result.customer.name}
              </p>
              <div
                style={{
                  background: "rgba(0, 0, 0, 0.2)",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginTop: "12px",
                }}
              >
                <div className="small muted" style={{ marginBottom: "4px" }}>
                  QR Token:
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "20px",
                    fontWeight: 700,
                    letterSpacing: "2px",
                    color: "#fff",
                  }}
                >
                  {result.repair.qrToken}
                </div>
                <p className="small muted" style={{ marginTop: "8px" }}>
                  Attach this QR code to the device for tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
              👤 Customer Information
            </h3>
            <div className="row">
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Full Name *
                </label>
                <input
                  style={{ width: "100%" }}
                  value={form.customerName}
                  onChange={update("customerName")}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  style={{ width: "100%" }}
                  value={form.customerPhone}
                  onChange={update("customerPhone")}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                style={{ width: "100%" }}
                value={form.customerEmail}
                onChange={update("customerEmail")}
                placeholder="customer@email.com"
              />
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
              📱 Device Details
            </h3>
            <div className="row">
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Brand
                </label>
                <input
                  style={{ width: "100%" }}
                  value={form.deviceBrand}
                  onChange={update("deviceBrand")}
                  placeholder="Apple, Samsung, etc."
                />
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Model
                </label>
                <input
                  style={{ width: "100%" }}
                  value={form.deviceModel}
                  onChange={update("deviceModel")}
                  placeholder="iPhone 14, Galaxy S23, etc."
                />
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Serial Number / IMEI
              </label>
              <input
                style={{ width: "100%" }}
                value={form.serialNumber}
                onChange={update("serialNumber")}
                placeholder="Device serial or IMEI number"
              />
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Issue Description
              </label>
              <textarea
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
                value={form.description}
                onChange={update("description")}
                placeholder="Describe the issue (e.g., Screen cracked, Won't turn on, Battery draining fast)"
              />
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
              📋 Intake Notes & Charges
            </h3>
            <div className="row">
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  style={{ width: "100%", resize: "vertical" }}
                  value={form.intakeNotes}
                  onChange={update("intakeNotes")}
                  placeholder="Any internal notes for the technician"
                />
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Flat Charge Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ width: "100%" }}
                  value={form.flatChargeAmount}
                  onChange={update("flatChargeAmount")}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: "12px 24px", fontSize: "15px", fontWeight: 600 }}
            >
              {loading ? "Creating..." : "✓ Create Intake"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IntakePage;
