import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../utils/apiClient.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("authToken"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { token: t, user: u } = res.data;
      setToken(t);
      setUser(u);
      localStorage.setItem("authToken", t);
      localStorage.setItem("authUser", JSON.stringify(u));
      api.defaults.headers.common.Authorization = `Bearer ${t}`;
      return u;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    delete api.defaults.headers.common.Authorization;
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      setUser(res.data);
      localStorage.setItem("authUser", JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      console.error("Refresh user failed", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () =>
    user?.roleCode === "ADMIN" ||
    user?.permissions?.includes("*:*") ||
    user?.roleName?.toLowerCase() === "admin" ||
    user?.roleName?.toLowerCase() === "hq access";

  const hasPermission = (perm) => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(perm);
  };

  const hasRole = (roleCode) => {
    if (!user) return false;
    if (isAdmin()) return true;
    if (!user.roleCode) return false;
    return user.roleCode === roleCode;
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

