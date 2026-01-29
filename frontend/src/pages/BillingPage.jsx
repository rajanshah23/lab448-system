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
  const [newCharge, setNewCharge] = useState({
    description: "",
    amount: 0,
  });
  const [payment, setPayment] = useState({
    amount: 0,
    method: "CASH",
  });
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
      setPaymentError(
        err.response?.data?.message || "Failed to record payment"
      );
    }
  };

  if (!billing || !repair) {
    return <div className="text-slate-300">Loading billing...</div>;
  }

  const remaining = billing.due;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Billing &amp; payment
          </h2>
          <p className="text-sm text-slate-400">
            {repair.customer.name} · {repair.device.brand} {repair.device.model}
          </p>
        </div>
        <button
          onClick={() => navigate(`/repairs/${id}`)}
          className="inline-flex items-center rounded-md border border-slate-700 text-sm font-medium text-slate-200 px-4 py-2"
        >
          Back to workspace
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Bill summary
          </h3>
          <div className="space-y-1 text-sm text-slate-200">
            <div className="flex justify-between">
              <span>Total charges</span>
              <span>₹{billing.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>₹{billing.paid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Due</span>
              <span>₹{billing.due.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Staff share (when fully paid): ₹
            {Number(repair.staffShareAmount).toFixed(2)} · Shop share: ₹
            {Number(repair.shopShareAmount).toFixed(2)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Bill status:{" "}
            <span className="font-medium">
              {billing.isLocked ? "Locked (no further changes)" : "Open"}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Charges</h3>
          {hasPermission(PERMISSIONS.MANAGE_BILLING) && !billing.isLocked && (
            <form onSubmit={addCharge} className="space-y-2 mb-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Description
                </label>
                <input
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  value={newCharge.description}
                  onChange={(e) =>
                    setNewCharge((c) => ({
                      ...c,
                      description: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                    value={newCharge.amount}
                    onChange={(e) =>
                      setNewCharge((c) => ({
                        ...c,
                        amount: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white px-3 py-2"
                >
                  Add charge
                </button>
              </div>
              {error && (
                <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </form>
          )}
          <div className="border-t border-slate-800 pt-2 max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 text-left font-medium">When</th>
                  <th className="py-1 text-left font-medium">Description</th>
                  <th className="py-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.charges.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800/80 text-slate-200"
                  >
                    <td className="py-1">
                      {new Date(c.createdAt).toLocaleString()}
                    </td>
                    <td className="py-1">
                      {c.type} · {c.description}
                    </td>
                    <td className="py-1 text-right">
                      ₹{Number(c.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {billing.charges.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 text-center text-slate-400"
                    >
                      No charges yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Payments</h3>
          {hasPermission(PERMISSIONS.TAKE_PAYMENT) && !billing.isLocked && (
            <form onSubmit={recordPayment} className="space-y-2 mb-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={remaining}
                  step="0.01"
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  value={payment.amount}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, amount: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Method
                </label>
                <select
                  className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  value={payment.method}
                  onChange={(e) =>
                    setPayment((p) => ({ ...p, method: e.target.value }))
                  }
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white px-3 py-2"
              >
                Record payment
              </button>
              {paymentError && (
                <div className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
                  {paymentError}
                </div>
              )}
            </form>
          )}
          <div className="border-t border-slate-800 pt-2 max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-400">
                <tr>
                  <th className="py-1 text-left font-medium">When</th>
                  <th className="py-1 text-left font-medium">Method</th>
                  <th className="py-1 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {billing.payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-800/80 text-slate-200"
                  >
                    <td className="py-1">
                      {new Date(p.receivedAt).toLocaleString()}
                    </td>
                    <td className="py-1">{p.method}</td>
                    <td className="py-1 text-right">
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {billing.payments.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-3 text-center text-slate-400"
                    >
                      No payments yet.
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

export default BillingPage;

