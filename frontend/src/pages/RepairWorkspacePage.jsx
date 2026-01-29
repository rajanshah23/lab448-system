import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";
import { useAuth } from "../state/AuthContext.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

const RepairWorkspacePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [repair, setRepair] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [inventorySelection, setInventorySelection] = useState({
    inventoryId: "",
    quantity: 1,
  });
  const [statusError, setStatusError] = useState("");
  const [invError, setInvError] = useState("");

  const load = async () => {
    const res = await api.get(`/repairs/${id}`);
    setRepair(res.data);
  };

  const loadInventory = async () => {
    if (!hasPermission(PERMISSIONS.MANAGE_INVENTORY)) return;
    const res = await api.get("/inventory");
    setInventory(res.data.filter((i) => i.isActive));
  };

  useEffect(() => {
    load();
    loadInventory();
  }, [id]);

  const transitionTo = async (newStatus) => {
    setStatusError("");
    try {
      await api.post(`/repairs/${id}/transition`, { newStatus });
      await load();
    } catch (err) {
      setStatusError(err.response?.data?.message || "Failed to change status");
    }
  };

  const addInventoryUsage = async () => {
    setInvError("");
    try {
      await api.post(`/repairs/${id}/use-inventory`, {
        inventoryId: inventorySelection.inventoryId,
        quantity: Number(inventorySelection.quantity),
      });
      await Promise.all([load(), loadInventory()]);
    } catch (err) {
      setInvError(err.response?.data?.message || "Failed to use inventory");
    }
  };

  if (!repair) {
    return <div className="text-slate-300">Loading repair...</div>;
  }

  const nextActions = [];
  if (repair.status === REPAIR_STATUS.IN_REPAIR) {
    nextActions.push({
      label: "Mark as repaired",
      status: REPAIR_STATUS.REPAIRED,
    });
    nextActions.push({
      label: "Mark as unrepairable",
      status: REPAIR_STATUS.UNREPAIRABLE,
    });
  } else if (
    repair.status === REPAIR_STATUS.REPAIRED ||
    repair.status === REPAIR_STATUS.UNREPAIRABLE
  ) {
    nextActions.push({
      label: "Mark as delivered",
      status: REPAIR_STATUS.DELIVERED,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Repair workspace
          </h2>
          <p className="text-sm text-slate-400">
            {repair.customer.name} · {repair.device.brand} {repair.device.model}
          </p>
        </div>
        <button
          onClick={() => navigate(`/repairs/${id}/billing`)}
          className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white px-4 py-2"
        >
          Billing &amp; payment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Customer
            </h3>
            <div className="text-sm text-slate-200">
              {repair.customer.name}
            </div>
            <div className="text-xs text-slate-400">
              {repair.customer.phone}
              {repair.customer.email && ` · ${repair.customer.email}`}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              QR token:
              <span className="ml-2 font-mono bg-slate-950 border border-slate-800 rounded px-2 py-1">
                {repair.qrToken}
              </span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Device
            </h3>
            <div className="text-sm text-slate-200">
              {repair.device.brand} {repair.device.model}
            </div>
            <div className="text-xs text-slate-400">
              Serial: {repair.device.serialNumber || "—"}
            </div>
            <div className="mt-2 text-xs text-slate-300">
              {repair.device.description}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Status</h3>
            <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-100">
              {repair.status.replace("_", " ")}
            </div>
            {statusError && (
              <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                {statusError}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {nextActions.map((a) => (
                <button
                  key={a.status}
                  onClick={() => transitionTo(a.status)}
                  className="inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white px-3 py-1.5"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-2">
              Inventory usage
            </h3>
            {hasPermission(PERMISSIONS.USE_INVENTORY) && (
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-slate-400 mb-1">
                    Item
                  </label>
                  <select
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                    value={inventorySelection.inventoryId}
                    onChange={(e) =>
                      setInventorySelection((s) => ({
                        ...s,
                        inventoryId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select item</option>
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} · stock {i.quantity} · ₹
                        {Number(i.unitPrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-20 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                    value={inventorySelection.quantity}
                    onChange={(e) =>
                      setInventorySelection((s) => ({
                        ...s,
                        quantity: e.target.value,
                      }))
                    }
                  />
                </div>
                <button
                  onClick={addInventoryUsage}
                  className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white px-3 py-2"
                >
                  Use inventory
                </button>
              </div>
            )}
            {invError && (
              <div className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                {invError}
              </div>
            )}
            <table className="w-full text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1 text-left font-medium">When</th>
                  <th className="py-1 text-left font-medium">Item</th>
                  <th className="py-1 text-left font-medium">Qty</th>
                  <th className="py-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {repair.inventoryUsage.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-800/80 text-slate-200"
                  >
                    <td className="py-1">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="py-1">{u.inventory.name}</td>
                    <td className="py-1">{u.quantityUsed}</td>
                    <td className="py-1 text-right">
                      ₹
                      {(
                        Number(u.unitPriceAtUse) * u.quantityUsed
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {repair.inventoryUsage.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-slate-400"
                    >
                      No inventory used yet.
                    </td>
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

export default RepairWorkspacePage;

