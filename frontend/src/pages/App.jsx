import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { Layout } from "../components/Layout.jsx";
import { ProtectedRoute } from "../components/ProtectedRoute.jsx";
import LoginPage from "./LoginPage.jsx";
import DashboardPage from "./DashboardPage.jsx";
import IntakePage from "./IntakePage.jsx";
import QueuePage from "./QueuePage.jsx";
import QrScanPage from "./QrScanPage.jsx";
import InventoryPage from "./InventoryPage.jsx";
import RepairWorkspacePage from "./RepairWorkspacePage.jsx";
import BillingPage from "./BillingPage.jsx";
import UsersPage from "./UsersPage.jsx";
import { PERMISSIONS } from "../constants/permissions.js";

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.VIEW_DASHBOARD]}>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/intake"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.INTAKE_REPAIR]}>
            <Layout>
              <IntakePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/queue"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.UPDATE_REPAIR_STATUS]}>
            <Layout>
              <QueuePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/qr-scan"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.UPDATE_REPAIR_STATUS,
              PERMISSIONS.MANAGE_BILLING,
            ]}
            requireAll={false}
          >
            <Layout>
              <QrScanPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.MANAGE_INVENTORY]}>
            <Layout>
              <InventoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermissions={[PERMISSIONS.MANAGE_USERS]}>
            <Layout>
              <UsersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs/:id"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.UPDATE_REPAIR_STATUS,
              PERMISSIONS.MANAGE_BILLING,
            ]}
            requireAll={false}
          >
            <Layout>
              <RepairWorkspacePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/repairs/:id/billing"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.MANAGE_BILLING,
              PERMISSIONS.TAKE_PAYMENT,
            ]}
            requireAll={false}
          >
            <Layout>
              <BillingPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

