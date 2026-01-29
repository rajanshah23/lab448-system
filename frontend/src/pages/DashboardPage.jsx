import React, { useEffect, useState } from "react";
import { api } from "../utils/apiClient.js";

const StatCard = ({ label, value }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
    <div className="text-xs uppercase tracking-wide text-slate-400">
      {label}
    </div>
    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
  </div>
);

const DashboardPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Repairs"
          value={summary ? summary.totalRepairs : "..."}
        />
        <StatCard
          label="Open Repairs"
          value={summary ? summary.openRepairs : "..."}
        />
        <StatCard
          label="Total Revenue"
          value={
            summary ? `₹${summary.totalRevenue.toFixed(2)}` : "₹0.00"
          }
        />
        <StatCard
          label="Today Revenue"
          value={
            summary ? `₹${summary.todayRevenue.toFixed(2)}` : "₹0.00"
          }
        />
      </div>
    </div>
  );
};

export default DashboardPage;

