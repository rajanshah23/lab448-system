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
  const [generatedSKU, setGeneratedSKU] = useState("");

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
    if (!window.JsBarcode) {
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Generate barcode when generatedSKU changes
  useEffect(() => {
    if (generatedSKU && window.JsBarcode) {
      setTimeout(() => {
        if (document.getElementById("popup-barcode")) {
          window.JsBarcode("#popup-barcode", generatedSKU, {
            format: "CODE128",
            width: 1.6,
            height: 60,
            displayValue: false,
            margin: 0,
          });
        }
      }, 100);
    }
  }, [generatedSKU]);


  const generateSKU = () => {
    if (editing) return;

    let highestNumber = 2000;

    items.forEach((item) => {
      if (item.sku && item.sku.startsWith("LABSKU-")) {
        const skuNumber = parseInt(item.sku.split("-")[1]);
        if (!isNaN(skuNumber) && skuNumber > highestNumber) {
          highestNumber = skuNumber;
        }
      }
    });

    if (form.sku && form.sku.startsWith("LABSKU-")) {
      const skuNumber = parseInt(form.sku.split("-")[1]);
      if (!isNaN(skuNumber) && skuNumber > highestNumber) {
        highestNumber = skuNumber;
      }
    }

    const newSKU = `LABSKU-${highestNumber + 1}`;

    setForm((f) => ({ ...f, sku: newSKU }));
    setGeneratedSKU(newSKU);

    setTimeout(() => {
      setGeneratedSKU("");
    }, 10000);
  };

  const startNew = () => {
    setEditing(null);
    setForm({
      name: "",
      sku: "",
      quantity: 0,
      unitPrice: 0,
      isActive: true,
    });
    setGeneratedSKU("");
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
    setGeneratedSKU("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      let finalForm = { ...form };

      finalForm.quantity = Number(finalForm.quantity);
      finalForm.unitPrice = Number(finalForm.unitPrice);

      if (!finalForm.sku.trim()) {
        let highestNumber = 2000;
        items.forEach((item) => {
          if (item.sku && item.sku.startsWith("LABSKU-")) {
            const num = parseInt(item.sku.split("-")[1]);
            if (!isNaN(num) && num > highestNumber) highestNumber = num;
          }
        });
        finalForm.sku = `LABSKU-${highestNumber + 1}`;
      }

      if (editing) {
        await api.put(`/inventory/${editing}`, finalForm);
        setSuccess("Item updated successfully!");
        setGeneratedSKU("");
      } else {
        await api.post("/inventory", finalForm);
        setSuccess("Item added successfully!");
        setGeneratedSKU(finalForm.sku);
      }

      await load();

      if (!editing) {
        setForm({
          name: "",
          sku: "",
          quantity: 0,
          unitPrice: 0,
          isActive: true,
        });

        setTimeout(() => {
          setSuccess("");
          setGeneratedSKU("");
        }, 3000);
      } else {
        startNew();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
      console.error("Save error:", err);
    }
  };

  const update = (field) => (e) => {
    const value =
      field === "isActive"
        ? e.target.checked
        : field === "quantity" || field === "unitPrice"
          ? Number(e.target.value) || 0
          : e.target.value;

    setForm((f) => ({ ...f, [field]: value }));
  };


  const handlePrintQR = (item) => {
    if (!item.sku) {
      alert("Item has no SKU to generate barcode");
      return;
    }

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
<html>
<head>
<title>Print Barcode - ${item.sku}</title>

<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

<style>
@page {
  size: 58mm auto;
  margin: 0;
}

body {
  width: 58mm;
  margin: 0;
  padding: 4mm;
  font-family: Arial, sans-serif;
  text-align: center;
}

.label {
  width: 100%;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

</style>
</head>

<body>

<div class="label">
  <svg id="barcode"></svg>
  <div class="info-row">
    <div>${item.name}</div>
    <div>${item.sku}</div>
  </div>
</div>

<script>
JsBarcode("#barcode", "${item.sku}", {
  format: "CODE128",
  width: 1.6,
  height: 60,
  displayValue: false,
  margin: 0
});

window.onload = function(){
  window.print();
};
</script>

</body>
</html>
`);

    printWindow.document.close();
  };

  const lowStockItems = items.filter((i) => i.quantity < 5 && i.isActive);
  const totalValue = items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0,
  );

  return (
    <div className="content">
      {generatedSKU && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "white",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            zIndex: 1000,
            animation: "slideDown 0.4s ease-out",
            maxWidth: "400px",
            width: "90%",
            border: "2px solid #e5e7eb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  background: "#10b981",
                  color: "white",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                ✓
              </span>
              NEW SKU GENERATED
            </div>


            <div
              style={{
                background: "white",
                padding: "20px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                SCANABLE BARCODE
              </div>

              {/* Real Barcode using JsBarcode */}
              <div
                style={{
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px",
                }}
              >
                <svg
                  id="popup-barcode"
                  style={{ height: "60px", width: "100%" }}
                />
              </div>


              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #e5e7eb",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                <div>
                  {generatedSKU}
                </div>
                <div>
                  {form.name || "New Inventory Item"}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "#070707",
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>⏱️ Auto-closes in 10 seconds</span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  printWindow.document.write(`
<html>
<head>
<title>Print Barcode - ${generatedSKU}</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<style>
@page {
  size: 58mm auto;
  margin: 0;
}
body {
  width: 58mm;
  margin: 0;
  padding: 4mm;
  font-family: Arial, sans-serif;
  text-align: center;
}
.label {
  width: 100%;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}
</style>
</head>
<body>
<div class="label">
  <svg id="print-barcode"></svg>
  <div class="info-row">
    <div>${generatedSKU}</div>
    <div>${form.name || "New Inventory Item"}</div>
  </div>
</div>
<script>
JsBarcode("#print-barcode", "${generatedSKU}", {
  format: "CODE128",
  width: 1.6,
  height: 60,
  displayValue: false,
  margin: 0
});
window.onload = function(){
  window.print();
  window.onafterprint = function() {
    window.close();
  };
};
</script>
</body>
</html>
`);
                  printWindow.document.close();
                }}
                className="btn btn-secondary"
                style={{
                  padding: "8px 16px",
                  color: "#070707",
                  fontSize: "12px",
                }}
              >
                🖨️ Print Now
              </button>
              <button
                onClick={() => setGeneratedSKU("")}
                className="btn btn-ghost"
                style={{
                  padding: "8px 16px",
                  fontSize: "12px",
                  color: "#070707",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          📦 Inventory Management
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Track parts, supplies, and stock levels
        </p>
      </div>


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
            background:
              "linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}
        >
          <div className="small muted" style={{ marginBottom: "6px" }}>
            Total Items
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {items.length}
          </div>
        </div>
        <div
          className="card"
          style={{
            background:
              "linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(251, 191, 36, 0.15))",
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
            background:
              "linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
            border: "1px solid rgba(59, 130, 246, 0.2)",
          }}
        >
          <div className="small muted" style={{ marginBottom: "6px" }}>
            Total Value
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            ₹{totalValue.toFixed(2)}
          </div>
        </div>
      </div>

      {success && !generatedSKU && (
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

      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          {editing ? "✏️ Edit Item" : "➕ Add New Item"}
        </h3>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div className="row">
            <div className="col">
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
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
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
                SKU / Part Number
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  style={{ width: "100%" }}
                  value={form.sku}
                  onChange={update("sku")}
                  placeholder="e.g., LABSKU-2000"
                  readOnly={!!editing && !!form.sku}
                />
                <button
                  type="button"
                  onClick={generateSKU}
                  className="btn btn-secondary"
                  style={{
                    whiteSpace: "nowrap",
                    padding: "0 20px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "500",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#e5e7eb";
                    e.target.style.borderColor = "#9ca3af";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "#f3f4f6";
                    e.target.style.borderColor = "#d1d5db";
                  }}
                  disabled={!!editing}
                >
                  Generate SKU
                </button>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
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
              <label
                className="small muted"
                style={{ display: "block", marginBottom: "6px" }}
              >
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
            <div
              className="col"
              style={{
                display: "flex",
                alignItems: "flex-end",
                paddingBottom: "10px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
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

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
              marginTop: "8px",
            }}
          >
            {editing && (
              <button
                type="button"
                onClick={startNew}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary">
              {editing ? "💾 Update Item" : "➕ Add Item"}
            </button>
          </div>
        </form>
      </div>


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
          ⚠️ {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""}{" "}
          running low on stock (less than 5 units)
        </div>
      )}


      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          Inventory Items
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Barcode</th>
                <th>Item Name</th>
                <th>SKU</th>
                <th style={{ textAlign: "right" }}>Quantity</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Total Value</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  style={{
                    background:
                      i.quantity < 5
                        ? "rgba(251, 146, 60, 0.05)"
                        : "transparent",
                  }}
                >
                  <td style={{ width: "60px", textAlign: "center" }}>
                    {i.sku && (
                      <button
                        onClick={() => handlePrintQR(i)}
                        className="btn btn-ghost"
                        style={{
                          fontSize: "14px",
                          padding: "6px 8px",
                          minWidth: "auto",
                          background: "rgba(59, 130, 246, 0.1)",
                          color: "#3b82f6",
                          borderRadius: "6px",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = "rgba(59, 130, 246, 0.2)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = "rgba(59, 130, 246, 0.1)";
                        }}
                        title="Print Barcode"
                      >
                        📋
                      </button>
                    )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{i.name}</td>
                  <td
                    className="small muted"
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontWeight: "500",
                    }}
                  >
                    {i.sku || "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        background:
                          i.quantity < 5
                            ? "rgba(251, 146, 60, 0.1)"
                            : "rgba(34, 197, 94, 0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: i.quantity < 5 ? "#fb923c" : "#4ade80",
                      }}
                    >
                      {i.quantity}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    ₹{Number(i.unitPrice).toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    ₹{(Number(i.unitPrice) * i.quantity).toFixed(2)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {i.isActive ? (
                      <span style={{ color: "#4ade80", fontSize: "12px" }}>
                        ● Active
                      </span>
                    ) : (
                      <span style={{ color: "#f87171", fontSize: "12px" }}>
                        ● Inactive
                      </span>
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
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "32px",
                      color: "var(--muted)",
                    }}
                  >
                    No inventory items yet. Add your first item above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default InventoryPage;
