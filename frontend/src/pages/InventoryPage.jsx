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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await api.put(`/inventory/${editing}`, {
          ...form,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        });
      } else {
        await api.post("/inventory", {
          ...form,
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        });
      }
      await load();
      startNew();
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const update = (field) => (e) => {
    const value =
      field === "isActive" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Inventory</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Name *
            </label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.name}
              onChange={update("name")}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              SKU
            </label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.sku}
              onChange={update("sku")}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="0"
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.quantity}
              onChange={update("quantity")}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Unit price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.unitPrice}
              onChange={update("unitPrice")}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={update("isActive")}
              className="rounded border-slate-700 bg-slate-950"
            />
            Active
          </label>
          <div className="space-x-2">
            <button
              type="button"
              onClick={startNew}
              className="inline-flex items-center rounded-md border border-slate-700 text-xs font-medium text-slate-200 px-3 py-1.5"
            >
              Clear
            </button>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white px-3 py-1.5"
            >
              {editing ? "Update item" : "Add item"}
            </button>
          </div>
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">SKU</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">
                Unit price
              </th>
              <th className="px-3 py-2 text-center font-medium">
                Active
              </th>
              <th className="px-3 py-2 text-right font-medium">Edit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr
                key={i.id}
                className="border-b border-slate-800/80 hover:bg-slate-800/40"
              >
                <td className="px-3 py-1.5 text-slate-200">{i.name}</td>
                <td className="px-3 py-1.5 text-slate-400">{i.sku}</td>
                <td className="px-3 py-1.5 text-right text-slate-200">
                  {i.quantity}
                </td>
                <td className="px-3 py-1.5 text-right text-slate-200">
                  ₹{Number(i.unitPrice).toFixed(2)}
                </td>
                <td className="px-3 py-1.5 text-center text-slate-200">
                  {i.isActive ? "Yes" : "No"}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button
                    onClick={() => startEdit(i)}
                    className="inline-flex items-center rounded-md border border-slate-700 text-xs font-medium text-slate-200 px-2 py-1"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No inventory items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryPage;

