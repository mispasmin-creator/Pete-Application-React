import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateEntryPage from './pages/CreateEntryPage';
import PeteRecordPage from './pages/PeteRecordPage';
import UserManagementPage from './pages/UserManagementPage';
import HODApprovalPage from './pages/HODApprovalPage';
import TallyEntryPage from './pages/TallyEntryPage';

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <span>Authenticating session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Granular Page Permission Route wrapper
function PageAccessRoute({ pagePath, children }) {
  const { user, hasPermission } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (hasPermission && !hasPermission(pagePath)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="create-entry"
              element={
                <PageAccessRoute pagePath="/create-entry">
                  <CreateEntryPage />
                </PageAccessRoute>
              }
            />
            <Route
              path="pete-record"
              element={
                <PageAccessRoute pagePath="/pete-record">
                  <PeteRecordPage />
                </PageAccessRoute>
              }
            />
            <Route
              path="user-management"
              element={
                <PageAccessRoute pagePath="/user-management">
                  <UserManagementPage />
                </PageAccessRoute>
              }
            />
            <Route
              path="hod-approval"
              element={
                <PageAccessRoute pagePath="/hod-approval">
                  <HODApprovalPage />
                </PageAccessRoute>
              }
            />
            <Route
              path="tally-entry"
              element={
                <PageAccessRoute pagePath="/tally-entry">
                  <TallyEntryPage />
                </PageAccessRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
