import React, { useState } from "react";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";

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
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      const serverCode = err.response?.data?.code;
      const status = err.response?.status;
      setError(
        serverMessage
          ? `${serverMessage}${serverCode ? ` (code: ${serverCode})` : ""}`
          : err.message || `Intake failed${status ? ` (status ${status})` : ""}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">New Repair Intake</h2>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-xl p-6"
      >
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Customer Details
          </h3>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Name *
            </label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.customerName}
              onChange={update("customerName")}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Phone
              </label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.customerPhone}
                onChange={update("customerPhone")}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.customerEmail}
                onChange={update("customerEmail")}
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">
            Device & Intake
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Brand
              </label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.deviceBrand}
                onChange={update("deviceBrand")}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Model
              </label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.deviceModel}
                onChange={update("deviceModel")}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Serial / IMEI
            </label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.serialNumber}
              onChange={update("serialNumber")}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Issue description
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              value={form.description}
              onChange={update("description")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Intake notes
              </label>
              <textarea
                rows={2}
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.intakeNotes}
                onChange={update("intakeNotes")}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Flat charge (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                value={form.flatChargeAmount}
                onChange={update("flatChargeAmount")}
              />
            </div>
          </div>
        </div>
        {error && (
          <div className="md:col-span-2 text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium text-white px-4 py-2"
          >
            {loading ? "Saving..." : "Create Intake"}
          </button>
        </div>
      </form>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Intake created
          </h3>
          <p className="text-sm text-slate-300">
            QR token for this repair:
          </p>
              <div className="text-lg font-mono bg-slate-950 border border-slate-800 rounded-md px-3 py-2 inline-block">
                {result.repair.qrToken}
              </div>
              <div className="mt-2">
                <span className="text-sm muted mr-2">Status:</span>
                <span className="text-sm font-medium">{result.repair.status}</span>
              </div>
              {result.repair.status === REPAIR_STATUS.INTAKE && (
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      try {
                        await api.post(`/repairs/${result.repair.id}/transition`, { newStatus: REPAIR_STATUS.TO_REPAIR });
                        // refresh small UI cue
                        setResult((r) => ({ ...r, repair: { ...r.repair, status: REPAIR_STATUS.TO_REPAIR } }));
                      } catch (e) {
                        alert(e.response?.data?.message || "Failed to move to queue");
                      }
                    }}
                    className="inline-flex items-center rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white px-3 py-1.5"
                  >
                    Move to Queue
                  </button>
                </div>
              )}
          <p className="text-xs text-slate-500">
            Attach this QR to the device. It will be used for tracking and
            billing.
          </p>
        </div>
      )}
    </div>
  );
};

export default IntakePage;

