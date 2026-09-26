import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { NotificationProvider } from './context/NotificationContext.js';
import { Layout } from './components/Layout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProductsPage } from './pages/ProductsPage.js';
import { ReceiptsPage } from './pages/ReceiptsPage.js';
import { DeliveriesPage } from './pages/DeliveriesPage.js';
import { TransfersPage } from './pages/TransfersPage.js';
import { AdjustmentsPage } from './pages/AdjustmentsPage.js';
import { LedgerPage } from './pages/LedgerPage.js';
import { WarehousesPage } from './pages/WarehousesPage.js';
import { AlertsPage } from './pages/AlertsPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { LoadingSpinner } from './components/EmptyState.js';

const ProtectedRoute: React.FC<{ children: React.ReactNode; managerOnly?: boolean }> = ({
  children,
  managerOnly = false
}) => {
  const { user, token, isLoading, isManager } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (managerOnly && !isManager) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public authentication routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected dashboard and inventory operational modules */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receipts"
              element={
                <ProtectedRoute>
                  <ReceiptsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/deliveries"
              element={
                <ProtectedRoute>
                  <DeliveriesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfers"
              element={
                <ProtectedRoute>
                  <TransfersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/adjustments"
              element={
                <ProtectedRoute>
                  <AdjustmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ledger"
              element={
                <ProtectedRoute>
                  <LedgerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/warehouses"
              element={
                <ProtectedRoute>
                  <WarehousesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <AlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute managerOnly>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
