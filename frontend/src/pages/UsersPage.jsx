import React, { useEffect, useState } from "react";
import { api } from "../utils/apiClient.js";
import { useAuth } from "../state/AuthContext.jsx";
import { ROLE_CODES, TECHNICIAN_LEVELS } from "../constants/permissions.js";

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    roleId: "",
    commissionRate: 0.2,
    technicianLevel: "",
    technicianLevelDisplay: "",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/roles"),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setForm({
      email: "",
      password: "",
      name: "",
      roleId: roles[0]?.id || "",
      commissionRate: 0.2,
      technicianLevel: "",
      technicianLevelDisplay: "",
      isActive: true,
    });
    setError("");
    setSuccess("");
  };

  const startEdit = (user) => {
    setEditing(user.id);
    setForm({
      email: user.email,
      password: "",
      name: user.name,
      roleId: user.roleId,
      commissionRate: Number(user.commissionRate || 0),
      technicianLevel: user.technicianLevel || "",
      technicianLevelDisplay: user.technicianLevelDisplay || "",
      isActive: user.isActive,
    });
    setError("");
    setSuccess("");
  };

  const selectedRole = roles.find((r) => r.id === form.roleId);
  const isTechnicianRole = selectedRole?.code === ROLE_CODES.TECHNICIAN;

  const adminUsers = users.filter((u) => u.roleCode === ROLE_CODES.ADMIN && u.isActive);
  const isEditingSelf = editing && currentUser && editing === currentUser.id;
  const editingUser = editing ? users.find((u) => u.id === editing) : null;
  const isEditingLastAdmin =
    editingUser?.roleCode === ROLE_CODES.ADMIN && adminUsers.length <= 1;
  const roleChangeDisabled =
    isEditingSelf && editingUser?.roleCode === ROLE_CODES.ADMIN
      ? true
      : isEditingLastAdmin;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const payload = {
      email: form.email,
      name: form.name,
      roleId: form.roleId,
      isActive: form.isActive,
      password: form.password || undefined,
    };
    if (isTechnicianRole) {
      payload.commissionRate = Number(form.commissionRate);
      if (form.technicianLevel) payload.technicianLevel = form.technicianLevel;
      if (form.technicianLevelDisplay) payload.technicianLevelDisplay = form.technicianLevelDisplay;
    }
    try {
      if (editing) {
        await api.put(`/users/${editing}`, payload);
        setSuccess("User updated successfully");
      } else {
        await api.post("/users", { ...payload, password: form.password });
        setSuccess("User created successfully");
      }
      await load();
      startNew();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/users/${id}`);
      setSuccess("User deleted successfully");
      await load();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };

  const update = (field) => (e) => {
    const value =
      field === "isActive" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="content">
      <div style={{ marginBottom: "8px" }}>
        <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700 }}>
          User Management
        </h2>
        <p className="muted small" style={{ marginTop: "4px" }}>
          Manage system users, roles, and permissions
        </p>
      </div>

      {success && (
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
          {success}
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
          {error}
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          {editing ? "Edit User" : "Create New User"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="row">
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Full Name *
              </label>
              <input
                style={{ width: "100%" }}
                value={form.name}
                onChange={update("name")}
                required
              />
            </div>
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Email *
              </label>
              <input
                type="email"
                style={{ width: "100%" }}
                value={form.email}
                onChange={update("email")}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Password {editing && "(leave blank to keep current)"}
              </label>
              <input
                type="password"
                style={{ width: "100%" }}
                value={form.password}
                onChange={update("password")}
                required={!editing}
              />
            </div>
            <div className="col">
              <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                Role * {roleChangeDisabled && "(locked - must keep at least one admin)"}
              </label>
              <select
                style={{
                  width: "100%",
                  opacity: roleChangeDisabled ? 0.7 : 1,
                  cursor: roleChangeDisabled ? "not-allowed" : "pointer",
                }}
                value={form.roleId}
                onChange={update("roleId")}
                required
                disabled={roleChangeDisabled}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.code && `(${r.code})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isTechnicianRole && (
            <div className="row">
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Commission Rate (0-1)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  style={{ width: "100%" }}
                  value={form.commissionRate}
                  onChange={update("commissionRate")}
                />
              </div>
              <div className="col">
                <label className="small muted" style={{ display: "block", marginBottom: "6px" }}>
                  Technician Level
                </label>
                <select
                  style={{ width: "100%" }}
                  value={form.technicianLevel}
                  onChange={(e) => {
                    const code = e.target.value;
                    setForm((f) => ({
                      ...f,
                      technicianLevel: code,
                      technicianLevelDisplay: code ? TECHNICIAN_LEVELS[code] : "",
                    }));
                  }}
                >
                  <option value="">-</option>
                  {Object.entries(TECHNICIAN_LEVELS).map(([code, display]) => (
                    <option key={code} value={code}>{display}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="row">
            <div className="col" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
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

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={startNew} className="btn btn-ghost">
              Clear
            </button>
            <button type="submit" className="btn btn-primary">
              {editing ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
          All Users
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Commission / Level</th>
                <th>Status</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td className="small muted">{u.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 10px",
                        background: "rgba(124, 92, 255, 0.1)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#a78bfa",
                      }}
                    >
                      {u.roleName}
                    </span>
                  </td>
                  <td className="small">
                    {u.roleCode === ROLE_CODES.TECHNICIAN ? (
                      <>
                        {(Number(u.commissionRate || 0) * 100).toFixed(0)}%
                        {u.technicianLevelDisplay && (
                          <span className="muted" style={{ marginLeft: "6px" }}>
                            · {u.technicianLevelDisplay}
                          </span>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {u.isActive ? (
                      <span style={{ color: "#4ade80", fontSize: "12px" }}>● Active</span>
                    ) : (
                      <span style={{ color: "#f87171", fontSize: "12px" }}>● Inactive</span>
                    )}
                  </td>
                  <td className="small muted">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => startEdit(u)}
                      className="btn btn-ghost"
                      style={{ marginRight: "6px", fontSize: "12px", padding: "6px 12px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="btn btn-ghost"
                      style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        color: "#f87171",
                        opacity: u.roleCode === ROLE_CODES.ADMIN && adminUsers.length <= 1 ? 0.5 : 1,
                        cursor: u.roleCode === ROLE_CODES.ADMIN && adminUsers.length <= 1 ? "not-allowed" : "pointer",
                      }}
                      disabled={u.roleCode === ROLE_CODES.ADMIN && adminUsers.length <= 1}
                      title={
                        u.roleCode === ROLE_CODES.ADMIN && adminUsers.length <= 1
                          ? "Cannot delete the last admin"
                          : "Delete user"
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No users yet.
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

export default UsersPage;
