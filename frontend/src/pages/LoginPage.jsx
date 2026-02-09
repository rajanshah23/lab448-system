import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
            }}
          >
            🔧
          </div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
            Lab448 Repair Console
          </h1>
          <p className="muted small" style={{ marginTop: "8px" }}>
            Sign in to manage repairs, inventory, and billing
          </p>
        </div>

        <div
          className="card"
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.05))",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "32px",
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                Email Address
              </label>
              <input
                type="email"
                style={{ width: "100%", fontSize: "15px" }}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
                Password
              </label>
              <input
                type="password"
                style={{ width: "100%", fontSize: "15px" }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "15px",
                fontWeight: 600,
                marginTop: "8px",
              }}
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p className="small muted">
            Powered by Lab448 Repair Shop Automation
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
