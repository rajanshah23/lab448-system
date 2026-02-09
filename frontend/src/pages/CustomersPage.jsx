import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/apiClient.js";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 20;

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/customers", {
        params: { q: searchQ || undefined, limit: DEFAULT_LIMIT },
      });
      setCustomers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQ]);

  useEffect(() => {
    const t = setTimeout(() => setSearchQ(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          👥 Customers
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Search and view customers; open a customer to see their previous repairs
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

      <div
        style={{
          background: "linear-gradient(135deg, rgba(124, 92, 255, 0.1), rgba(96, 165, 250, 0.1))",
          border: "1px solid rgba(124, 92, 255, 0.2)",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <label htmlFor="customer-search" className="small muted" style={{ flex: "0 0 auto" }}>
          Search by name, phone, or email
        </label>
        <input
          id="customer-search"
          type="text"
          placeholder="Type to filter..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{
            flex: "1 1 200px",
            minWidth: "180px",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--panel)",
            color: "var(--text)",
          }}
        />
        <span className="small muted">
          {loading ? "Loading..." : `${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Another number</th>
                <th>Email</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.name}</td>
                  <td className="muted small">{c.phone || "—"}</td>
                  <td className="muted small">{c.phone2 || "—"}</td>
                  <td className="muted small">{c.email || "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="btn btn-primary"
                      style={{ fontSize: "12px", padding: "8px 16px" }}
                    >
                      View &amp; repairs
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "48px 20px",
                      color: "var(--muted)",
                    }}
                  >
                    {searchQ
                      ? "No customers match your search"
                      : "No customers yet. Create one via Intake."}
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

export default CustomersPage;
