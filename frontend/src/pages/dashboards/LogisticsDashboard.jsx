import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../utils/apiClient.js";

const StatCard = ({ label, value, icon, gradient }) => (
  <div
    className="card"
    style={{
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      border: "none",
      position: "relative",
      overflow: "hidden",
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

const LogisticsDashboard = () => {
  const [data, setData] = useState(null);
  const [assignForm, setAssignForm] = useState({ repairId: "", inventoryId: "", quantity: 1 });
  const [assignMsg, setAssignMsg] = useState("");

  useEffect(() => {
    api.get("/dashboard/logistics").then((r) => setData(r.data)).catch(console.error);
  }, []);

  const overview = data?.inventory_overview || {};
  const lowStock = overview.low_stock_items || [];
  const mostUsed = data?.most_used_items || [];
  const recentUsages = data?.recent_usages || [];

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssignMsg("");
    try {
      await api.post("/inventory/assign-to-repair", {
        repair_id: assignForm.repairId,
        inventory_id: assignForm.inventoryId,
        quantity: Number(assignForm.quantity) || 1,
      });
      setAssignMsg("Assigned successfully");
      setAssignForm({ repairId: "", inventoryId: "", quantity: 1 });
      const r = await api.get("/dashboard/logistics");
      setData(r.data);
    } catch (err) {
      setAssignMsg(err.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="content dashboard-logistics">
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>📦 Logistics Dashboard</h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Inventory management and parts handling
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          icon="📦"
          label="Total Items"
          value={overview.total_items ?? "..."}
          gradient={["rgba(251, 146, 60, 0.25)", "rgba(251, 191, 36, 0.2)"]}
        />
        <StatCard
          icon="💰"
          label="Total Value"
          value={overview.total_value != null ? `₹${Number(overview.total_value).toFixed(2)}` : "..."}
          gradient={["rgba(59, 130, 246, 0.25)", "rgba(147, 51, 234, 0.2)"]}
        />
        <StatCard
          icon="⚠️"
          label="Low Stock"
          value={lowStock.length}
          gradient={lowStock.length > 0 ? ["rgba(239, 68, 68, 0.25)", "rgba(248, 113, 113, 0.2)"] : ["rgba(34, 197, 94, 0.25)", "rgba(16, 185, 129, 0.2)"]}
        />
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
          Assign Inventory to Repair
        </h3>
        <form onSubmit={handleAssign} style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Repair ID</label>
            <input
              type="text"
              value={assignForm.repairId}
              onChange={(e) => setAssignForm((s) => ({ ...s, repairId: e.target.value }))}
              placeholder="Repair ID"
              required
              style={{ minWidth: "140px" }}
            />
          </div>
          <div>
            <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Inventory ID</label>
            <input
              type="text"
              value={assignForm.inventoryId}
              onChange={(e) => setAssignForm((s) => ({ ...s, inventoryId: e.target.value }))}
              placeholder="Inventory ID"
              required
              style={{ minWidth: "140px" }}
            />
          </div>
          <div>
            <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Quantity</label>
            <input
              type="number"
              min="1"
              value={assignForm.quantity}
              onChange={(e) => setAssignForm((s) => ({ ...s, quantity: e.target.value }))}
              style={{ width: "80px" }}
            />
          </div>
          <button type="submit" className="btn btn-primary">Assign</button>
          {assignMsg && <span className={assignMsg.includes("success") ? "" : "muted"} style={{ alignSelf: "center" }}>{assignMsg}</span>}
        </form>
      </div>

      {lowStock.length > 0 && (
        <div className="card" style={{ marginTop: "24px", borderLeft: "4px solid #ef4444" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600, color: "#f87171" }}>
            ⚠️ Low Stock Items
          </h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Qty</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td><code>{i.sku || "—"}</code></td>
                  <td style={{ color: "#f87171", fontWeight: 700 }}>{i.quantity}</td>
                  <td>₹{Number(i.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>Most Used Items</h3>
          {mostUsed.length === 0 ? (
            <p className="muted">No usage data</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Uses (30d)</th>
                </tr>
              </thead>
              <tbody>
                {mostUsed.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td>{i.usage_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>Recent Usages</h3>
          {recentUsages.length === 0 ? (
            <p className="muted">No recent usages</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Repair</th>
                </tr>
              </thead>
              <tbody>
                {recentUsages.slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td>{u.inventory?.name}</td>
                    <td>{u.quantityUsed}</td>
                    <td><code>{u.repair?.qrToken}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "24px" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
        <Link to="/inventory" style={{ textDecoration: "none" }}>
          <button className="btn btn-primary">📦 Manage Inventory</button>
        </Link>
      </div>
    </div>
  );
};

export default LogisticsDashboard;
