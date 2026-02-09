import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../utils/apiClient.js";
import { validatePhone, validateEmail } from "../utils/validation.js";
import deviceBrands from "../data/deviceBrands.json";

const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;
const CUSTOMER_SEARCH_MIN_LEN = 2;
const CUSTOMER_SEARCH_LIMIT = 10;

const PrintIcon = ({ size = 20, style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IntakePage = () => {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerPhone2: "",
    customerEmail: "",
    deviceBrand: "",
    deviceModel: "",
    serialNumber: "",
    description: "",
    intakeNotes: "",
    flatChargeAmount: 0,
  });
  const [categoryFlat, setCategoryFlat] = useState([]);
  const [category1Id, setCategory1Id] = useState("");
  const [category2Id, setCategory2Id] = useState("");
  const [category3Id, setCategory3Id] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerSearchDebounced, setCustomerSearchDebounced] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const intakeQrPrintRef = useRef(null);
  const customerSearchRef = useRef(null);
  const brandInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(
      () => setCustomerSearchDebounced(customerSearchInput.trim()),
      CUSTOMER_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [customerSearchInput]);

  useEffect(() => {
    if (customerSearchDebounced.length < CUSTOMER_SEARCH_MIN_LEN) {
      setCustomerSearchResults([]);
      return;
    }
    let cancelled = false;
    setCustomerSearchLoading(true);
    api
      .get("/customers", { params: { q: customerSearchDebounced, limit: CUSTOMER_SEARCH_LIMIT } })
      .then((res) => {
        if (!cancelled) setCustomerSearchResults(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setCustomerSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setCustomerSearchLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerSearchDebounced]);

  const selectCustomer = useCallback((c) => {
    setForm((f) => ({
      ...f,
      customerName: c.name,
      customerPhone: c.phone || "",
      customerPhone2: c.phone2 || "",
      customerEmail: c.email || "",
    }));
    setSelectedCustomerId(c.id);
    setCustomerSearchInput("");
    setCustomerSearchResults([]);
    setCustomerDropdownOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
      if (brandInputRef.current && !brandInputRef.current.contains(e.target)) {
        setBrandDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  useEffect(() => {
    api
      .get("/repair-categories?format=flat")
      .then((res) => setCategoryFlat(res.data))
      .catch(() => setCategoryFlat([]));
  }, []);

  const level1Options = categoryFlat.filter((c) => c.level === 1);
  const level2Options = categoryFlat.filter((c) => c.parentId === category1Id);
  const level3Options = categoryFlat.filter((c) => c.parentId === category2Id);
  const selectedCategory3 = categoryFlat.find((c) => c.id === category3Id);
  const flatRateFromCategory = selectedCategory3?.flatRate ?? null;

  const update = (field) => (e) => {
    const v = e.target.value;
    if ((field === "customerPhone" || field === "customerPhone2") && v !== "" && !/^\d*$/.test(v)) return;
    setForm((f) => ({ ...f, [field]: v }));
    if (["customerName", "customerPhone", "customerPhone2", "customerEmail"].includes(field)) {
      setSelectedCustomerId(null);
      setFieldErrors((err) => ({ ...err, [field]: undefined }));
    }
  };

  const onCategory1Change = (e) => {
    const id = e.target.value || "";
    setCategory1Id(id);
    setCategory2Id("");
    setCategory3Id("");
  };
  const onCategory2Change = (e) => {
    const id = e.target.value || "";
    setCategory2Id(id);
    setCategory3Id("");
  };
  const onCategory3Change = (e) => {
    setCategory3Id(e.target.value || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    const phoneFilled = (form.customerPhone != null && String(form.customerPhone).trim() !== "");
    if (!phoneFilled) {
      errors.customerPhone = "Please fill your primary phone number";
    } else {
      const r = validatePhone(form.customerPhone);
      if (!r.valid) errors.customerPhone = r.message;
    }
    const phone2Filled = (form.customerPhone2 != null && String(form.customerPhone2).trim() !== "");
    if (phone2Filled) {
      const r = validatePhone(form.customerPhone2);
      if (!r.valid) errors.customerPhone2 = r.message;
    }
    const emailResult = validateEmail(form.customerEmail);
    if (!emailResult.valid) errors.customerEmail = emailResult.message;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const customerPayload = {
        name: form.customerName,
        phone: form.customerPhone || null,
        phone2: form.customerPhone2 || null,
        email: form.customerEmail || null,
      };
      if (selectedCustomerId) customerPayload.id = selectedCustomerId;

      const payload = {
        customer: customerPayload,
        device: {
          brand: form.deviceBrand || null,
          model: form.deviceModel || null,
          serialNumber: form.serialNumber || null,
          description: form.description || null,
        },
        intakeNotes: form.intakeNotes || null,
        flatChargeAmount: Number(form.flatChargeAmount || 0),
      };
      if (category3Id) payload.repairCategoryId = category3Id;
      const res = await api.post("/repairs/intake", payload);
      setResult(res.data);
      setForm({
        customerName: "",
        customerPhone: "",
        customerPhone2: "",
        customerEmail: "",
        deviceBrand: "",
        deviceModel: "",
        serialNumber: "",
        description: "",
        intakeNotes: "",
        flatChargeAmount: 0,
      });
      setFieldErrors({});
      setSelectedCustomerId(null);
      setCustomerSearchInput("");
      setCustomerSearchResults([]);
      setCategory1Id("");
      setCategory2Id("");
      setCategory3Id("");
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#4ade80" }}>
                  Intake Created Successfully!
                </h3>
                <button
                  type="button"
                  onClick={() => printQrContent(intakeQrPrintRef)}
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
                  <PrintIcon size={20} style={{ color: "#4ade80" }} />
                </button>
              </div>
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
                <div ref={intakeQrPrintRef} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "12px" }}>
                  <div style={{ background: "#fff", padding: "8px", borderRadius: "8px", display: "inline-block" }}>
                    <QRCodeSVG value={result.repair.qrToken} size={140} level="M" />
                  </div>
                  <span className="token" style={{ marginTop: "8px", fontFamily: "monospace", fontSize: "14px", color: "var(--muted)" }}>
                    {result.repair.qrToken}
                  </span>
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
            <div ref={customerSearchRef} style={{ position: "relative", marginBottom: "14px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Search existing customer (optional)
              </label>
              <input
                type="text"
                placeholder="Type name, phone, or email..."
                value={customerSearchInput}
                onChange={(e) => {
                  setCustomerSearchInput(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => customerSearchResults.length > 0 && setCustomerDropdownOpen(true)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
              />
              {selectedCustomerId && (
                <div className="small" style={{ marginTop: "6px", color: "var(--accent)" }}>
                  ✓ Using existing customer
                </div>
              )}
              {customerDropdownOpen && (customerSearchInput.trim().length >= CUSTOMER_SEARCH_MIN_LEN || customerSearchResults.length > 0) && (
                <ul
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    margin: 0,
                    padding: "8px 0",
                    listStyle: "none",
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                    zIndex: 100,
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}
                >
                  {customerSearchLoading && (
                    <li style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "14px" }}>
                      Searching...
                    </li>
                  )}
                  {!customerSearchLoading && customerSearchResults.length === 0 && customerSearchDebounced.length >= CUSTOMER_SEARCH_MIN_LEN && (
                    <li style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "14px" }}>
                      No customer found
                    </li>
                  )}
                  {!customerSearchLoading && customerSearchResults.map((c) => (
                    <li
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectCustomer(c)}
                      onKeyDown={(e) => e.key === "Enter" && selectCustomer(c)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        fontSize: "14px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 92, 255, 0.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div className="small muted">{[c.phone, c.phone2, c.email].filter(Boolean).join(" · ") || "—"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
                  Primary phone (10 digits) *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  style={{ width: "100%", borderColor: fieldErrors.customerPhone ? "#f87171" : undefined }}
                  value={form.customerPhone}
                  onChange={update("customerPhone")}
                  placeholder="9876543210"
                />
                {fieldErrors.customerPhone && (
                  <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{fieldErrors.customerPhone}</div>
                )}
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Another number (10 digits)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  style={{ width: "100%", borderColor: fieldErrors.customerPhone2 ? "#f87171" : undefined }}
                  value={form.customerPhone2}
                  onChange={update("customerPhone2")}
                  placeholder="Optional"
                />
                {fieldErrors.customerPhone2 && (
                  <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{fieldErrors.customerPhone2}</div>
                )}
              </div>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Email Address
              </label>
              <input
                type="email"
                style={{ width: "100%", borderColor: fieldErrors.customerEmail ? "#f87171" : undefined }}
                value={form.customerEmail}
                onChange={update("customerEmail")}
                placeholder="customer@email.com"
              />
              {fieldErrors.customerEmail && (
                <div className="small" style={{ color: "#f87171", marginTop: "4px" }}>{fieldErrors.customerEmail}</div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: 600 }}>
              📱 Device Details
            </h3>
            <div className="row">
              <div className="col" ref={brandInputRef} style={{ position: "relative" }}>
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Brand
                </label>
                <input
                  style={{ width: "100%" }}
                  value={form.deviceBrand}
                  onChange={update("deviceBrand")}
                  onFocus={() => setBrandDropdownOpen(true)}
                  placeholder="Select or type brand"
                  autoComplete="off"
                />
                {brandDropdownOpen && (
                  <ul
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      margin: 0,
                      padding: "6px 0",
                      listStyle: "none",
                      background: "var(--panel)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                      zIndex: 100,
                      maxHeight: "220px",
                      overflowY: "auto",
                    }}
                  >
                    {deviceBrands.filter((b) => !form.deviceBrand || b.toLowerCase().includes(form.deviceBrand.toLowerCase())).map((b) => (
                      <li
                        key={b}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setForm((f) => ({ ...f, deviceBrand: b }));
                          setBrandDropdownOpen(false);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (setForm((f) => ({ ...f, deviceBrand: b })), setBrandDropdownOpen(false))}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 92, 255, 0.15)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        {b}
                      </li>
                    ))}
                    <li
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setForm((f) => ({ ...f, deviceBrand: "" }));
                        setBrandDropdownOpen(false);
                        setTimeout(() => brandInputRef.current?.querySelector("input")?.focus(), 0);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (setForm((f) => ({ ...f, deviceBrand: "" })), setBrandDropdownOpen(false))}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: "14px", borderTop: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124, 92, 255, 0.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      Others
                    </li>
                  </ul>
                )}
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
              📂 Repair Category (flat rate)
            </h3>
            <p className="small muted" style={{ marginBottom: "12px" }}>
              Select Category Level 1 → 2 → 3 to apply the category flat rate. Leave empty to use manual amount below.
            </p>
            <div className="row" style={{ gap: "12px", marginBottom: "12px" }}>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Category Level 1
                </label>
                <select
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  value={category1Id}
                  onChange={onCategory1Change}
                >
                  <option value="">— Select —</option>
                  {level1Options.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Category Level 2
                </label>
                <select
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  value={category2Id}
                  onChange={onCategory2Change}
                  disabled={!category1Id}
                >
                  <option value="">— Select —</option>
                  {level2Options.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Category Level 3
                </label>
                <select
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}
                  value={category3Id}
                  onChange={onCategory3Change}
                  disabled={!category2Id}
                >
                  <option value="">— Select —</option>
                  {level3Options.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.flatRate != null ? `(₹${Number(c.flatRate)})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>
            {flatRateFromCategory != null && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(34, 197, 94, 0.1)", borderRadius: "8px", fontSize: "14px" }}>
                Flat rate for <strong>{selectedCategory3?.name}</strong>: <strong>₹{Number(flatRateFromCategory).toFixed(2)}</strong>
              </div>
            )}
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
                  Flat Charge Amount (₹) — used if no category selected
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ width: "100%" }}
                  value={category3Id ? flatRateFromCategory ?? form.flatChargeAmount : form.flatChargeAmount}
                  onChange={update("flatChargeAmount")}
                  placeholder="0.00"
                  readOnly={!!category3Id}
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
