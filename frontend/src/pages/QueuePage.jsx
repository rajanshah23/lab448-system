import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/apiClient.js";
import { REPAIR_STATUS } from "../constants/statuses.js";

const QueuePage = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all"); // 'all' | 'intake' | 'to_repair'
  const [statusParamDisplay, setStatusParamDisplay] = useState("");
  const navigate = useNavigate();

  const load = async (selectedTab = tab) => {
    setLoading(true);
    setError("");
    try {
      let statusParam;
      if (selectedTab === "all") {
        statusParam = `${REPAIR_STATUS.INTAKE},${REPAIR_STATUS.TO_REPAIR}`;
      } else if (selectedTab === "intake") {
        statusParam = REPAIR_STATUS.INTAKE;
      } else {
        statusParam = REPAIR_STATUS.TO_REPAIR;
      }

      // Show which tab and statusParam are being requested (on-screen + console)
      console.debug("Queue.load() -> selectedTab:", selectedTab, "statusParam:", statusParam);
      setStatusParamDisplay(statusParam);

      // Use axios params so baseURL is respected (do NOT prepend /api here,
      // axios already has baseURL set to '/api').
      console.debug("Queue.load() -> requesting statusParam", statusParam);
      const res = await api.get("/repairs/queue", { params: { status: statusParam } });
      setRepairs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Explicitly set and load the 'All' tab on mount so newly-created intakes
    // appear immediately without requiring the user to click the tab.
    setTab("all");
    load("all");
  }, []);

  const moveToInRepair = async (id) => {
    try {
      await api.post(`/repairs/${id}/transition`, {
        newStatus: REPAIR_STATUS.IN_REPAIR,
      });
      navigate(`/repairs/${id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const changeStatus = async (id, newStatus) => {
    try {
      await api.post(`/repairs/${id}/transition`, { newStatus });
      // reload current tab
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {tab === "all" ? "Queue" : tab === "intake" ? "Intake Queue" : "To-Repair Queue"}
        </h2>
        <div className="inline-flex rounded-md bg-slate-900/30 p-1">
          <button
            onClick={() => { setTab("all"); load("all"); }}
            className={`px-3 py-1 text-sm ${tab === "all" ? "bg-gradient-to-r from-teal-400 to-sky-400 text-black font-semibold rounded-md" : "text-slate-300"}`}
          >
            All
          </button>
          <button
            onClick={() => { setTab("intake"); load("intake"); }}
            className={`px-3 py-1 text-sm ${tab === "intake" ? "bg-gradient-to-r from-teal-400 to-sky-400 text-black font-semibold rounded-md" : "text-slate-300"}`}
          >
            Intake
          </button>
          <button
            onClick={() => { setTab("to_repair"); load("to_repair"); }}
            className={`px-3 py-1 text-sm ${tab === "to_repair" ? "bg-gradient-to-r from-teal-400 to-sky-400 text-black font-semibold rounded-md" : "text-slate-300"}`}
          >
            To-Repair
          </button>
        </div>
      </div>
      <div className="text-xs text-slate-400 mt-2">Requested statuses: <span className="font-mono text-sm text-slate-200">{statusParamDisplay || "-"}</span></div>
      {error && (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2 flex items-center justify-between">
          <div>{error}</div>
          {String(error).toLowerCase().includes("authorization") && (
            <div>
              <a href="/login" className="ml-4 inline-flex items-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white px-3 py-1">
                Go to Login
              </a>
            </div>
          )}
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Created</th>
              <th className="px-3 py-2 text-left font-medium">Customer</th>
              <th className="px-3 py-2 text-left font-medium">Device</th>
              <th className="px-3 py-2 text-left font-medium">QR</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {repairs.map((r) => (
              <tr
                key={r.id}
                className="border-b border-slate-800/80 hover:bg-slate-800/40"
              >
                <td className="px-3 py-2 text-slate-300">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-slate-200">
                  {r.customer?.name}
                  <div className="text-xs text-slate-400">
                    {r.customer?.phone}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-200">
                  {r.device?.brand} {r.device?.model}
                  <div className="text-xs text-slate-400">
                    {r.device?.serialNumber}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-slate-300">
                  {r.qrToken}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.status === REPAIR_STATUS.INTAKE && (
                    <>
                      <button
                        onClick={() => changeStatus(r.id, REPAIR_STATUS.TO_REPAIR)}
                        className="inline-flex items-center rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-medium text-white px-3 py-1.5 mr-2"
                      >
                        Move to Queue
                      </button>
                      <button
                        onClick={() => navigate(`/repairs/${r.id}`)}
                        className="inline-flex items-center rounded-md bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white px-3 py-1.5"
                      >
                        View
                      </button>
                    </>
                  )}
                  {r.status === REPAIR_STATUS.TO_REPAIR && (
                    <>
                      <button
                        onClick={() => changeStatus(r.id, REPAIR_STATUS.INTAKE)}
                        className="inline-flex items-center rounded-md bg-gray-600 hover:bg-gray-500 text-xs font-medium text-white px-3 py-1.5 mr-2"
                      >
                        Revert to Intake
                      </button>
                      <button
                        onClick={() => moveToInRepair(r.id)}
                        className="inline-flex items-center rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white px-3 py-1.5"
                      >
                        Start Repair
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!loading && repairs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No items in queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QueuePage;

