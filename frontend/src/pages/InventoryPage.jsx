import React, { useEffect, useState } from "react";
import { api } from "../utils/apiClient.js";

const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    quantity: 0,
    unitPrice: 0,
    isActive: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/inventory");
      setItems(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      quantity: 0,
      unitPrice: 0,
      isActive: true,
    });
    setError("");
    setSuccess("");
  };

  const startEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      sku: item.sku || "",
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      isActive: item.isActive,
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await api.put(`/inventory/${editing}`, {
          ...form,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        });
        setSuccess("Item updated successfully!");
      } else {
        await api.post("/inventory", {
          ...form,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        });
        setSuccess("Item added successfully!");
      }
      await load();
      startNew();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const update = (field) => (e) => {
    const value =
      field === "isActive" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const lowStockItems = items.filter((i) => i.quantity < 5 && i.isActive);
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0
  );

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          📦 Inventory Management
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Track parts, supplies, and stock levels
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <div className="small muted" style={{ marginBottom: "6px" }}>
            Total Items
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{items.length}</div>
        </div>
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(251, 191, 36, 0.15))",
            border: "1px solid rgba(251, 146, 60, 0.2)",
          }}
        >
          <div className="small muted" style={{ marginBottom: "6px" }}>
            Low Stock
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "#fb923c" }}>
            {lowStockItems.length}
          </div>
        </div>
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <div className="small muted" style={{ marginBottom: "6px" }}>
            Total Value
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>₹{totalValue.toFixed(2)}</div>
        </div>
      </div>

      {success && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "10px",
            color: "#4ade80",
            fontSize: "14px",
          }}
        >
          ✓ {success}
        </div>
      )}

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

      {/* Add/Edit Form */}
      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          {editing ? "✏️ Edit Item" : "➕ Add New Item"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="row">
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Item Name *
              </label>
              <input
                style={{ width: "100%" }}
                value={form.name}
                onChange={update("name")}
                placeholder="e.g., LCD Display, Battery Pack"
                required
              />
            </div>
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                SKU / Part Number
              </label>
              <input
                style={{ width: "100%" }}
                value={form.sku}
                onChange={update("sku")}
                placeholder="e.g., LCD-001"
              />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Quantity in Stock
              </label>
              <input
                type="number"
                min="0"
                style={{ width: "100%" }}
                value={form.quantity}
                onChange={update("quantity")}
              />
            </div>
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Unit Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ width: "100%" }}
                value={form.unitPrice}
                onChange={update("unitPrice")}
              />
            </div>
            <div className="col" style={{ display: "flex", alignItems: "flex-end", paddingBottom: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={update("isActive")}
                  style={{ width: "auto", cursor: "pointer" }}
                />
                <span className="small">Active</span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            {editing && (
              <button type="button" onClick={startNew} className="btn btn-ghost">
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              {editing ? "💾 Update Item" : "➕ Add Item"}
            </button>
          </div>
        </form>
      </div>

      {/* Low Stock Warning */}
      {lowStockItems.length > 0 && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(251, 146, 60, 0.1)",
            border: "1px solid rgba(251, 146, 60, 0.3)",
            borderRadius: "10px",
            color: "#fb923c",
            fontSize: "14px",
          }}
        >
          ⚠️ {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} running low on
          stock (less than 5 units)
        </div>
      )}

      {/* Inventory Table */}
      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          Inventory Items
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Total Value</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  style={{
                    background: i.quantity < 5 ? "rgba(251, 146, 60, 0.05)" : "transparent",
                  }}
                >
                  <td style={{ fontWeight: 500 }}>{i.name}</td>
                  <td className="small muted">{i.sku || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background: i.quantity < 5 ? "rgba(251, 146, 60, 0.1)" : "rgba(34, 197, 94, 0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: i.quantity < 5 ? "#fb923c" : "#4ade80",
                      }}
                    >
                      {i.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>₹{Number(i.unitPrice).toFixed(2)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    ₹{(Number(i.unitPrice) * i.quantity).toFixed(2)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {i.isActive ? (
                      <span style={{ color: "#4ade80", fontSize: "12px" }}>● Active</span>
                    ) : (
                      <span style={{ color: "#f87171", fontSize: "12px" }}>● Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => startEdit(i)}
                      className="btn btn-ghost"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No inventory items yet. Add your first item above.
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

export default InventoryPage;
