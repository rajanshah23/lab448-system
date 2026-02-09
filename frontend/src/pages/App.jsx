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
import CustomersPage from "./CustomersPage.jsx";
import CustomerDetailPage from "./CustomerDetailPage.jsx";
import TechnicianDashboard from "./dashboards/TechnicianDashboard.jsx";
import FrontDeskDashboard from "./dashboards/FrontDeskDashboard.jsx";
import LogisticsDashboard from "./dashboards/LogisticsDashboard.jsx";
import FinanceDashboard from "./dashboards/FinanceDashboard.jsx";
import ManagerDashboard from "./dashboards/ManagerDashboard.jsx";
import AdminDashboard from "./dashboards/AdminDashboard.jsx";
import BillingPaymentsDashboard from "./dashboards/BillingPaymentsDashboard.jsx";
import { PERMISSIONS, ROLE_CODES } from "../constants/permissions.js";

const DashboardRedirect = () => {
  const { user } = useAuth();
  const code = user?.roleCode;
  if (code === ROLE_CODES.ADMIN)
    return <Navigate to="/dashboard/admin" replace />;
  if (code === ROLE_CODES.TECHNICIAN)
    return <Navigate to="/dashboard/technician" replace />;
  if (code === ROLE_CODES.FRONT_DESK)
    return <Navigate to="/dashboard/front-desk" replace />;
  if (code === ROLE_CODES.LOGISTICS)
    return <Navigate to="/dashboard/logistics" replace />;
  if (code === ROLE_CODES.FINANCE)
    return <Navigate to="/dashboard/finance" replace />;
  if (code === ROLE_CODES.MANAGER)
    return <Navigate to="/dashboard/manager" replace />;
  return <DashboardPage />;
};

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
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.VIEW_DASHBOARD,
              PERMISSIONS.ADMIN_WILDCARD,
            ]}
            requireAll={false}
          >
            <Layout>
              <DashboardRedirect />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/technician"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.TECHNICIAN, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <TechnicianDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/front-desk"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.FRONT_DESK, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <FrontDeskDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/logistics"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.LOGISTICS, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <LogisticsDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/finance"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.FINANCE, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <FinanceDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/manager"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.MANAGER, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <ManagerDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute requiredRoles={[ROLE_CODES.ADMIN]}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/billing-payments"
        element={
          <ProtectedRoute
            requiredRoles={[ROLE_CODES.FINANCE, ROLE_CODES.ADMIN]}
          >
            <Layout>
              <BillingPaymentsDashboard />
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
          <ProtectedRoute
            requiredPermissions={[PERMISSIONS.UPDATE_REPAIR_STATUS]}
          >
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
        path="/customers"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.VIEW_DASHBOARD,
              PERMISSIONS.INTAKE_REPAIR,
            ]}
            requireAll={false}
          >
            <Layout>
              <CustomersPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute
            requiredPermissions={[
              PERMISSIONS.VIEW_DASHBOARD,
              PERMISSIONS.INTAKE_REPAIR,
            ]}
            requireAll={false}
          >
            <Layout>
              <CustomerDetailPage />
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
