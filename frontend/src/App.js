import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Threats from "./pages/Threats";
import Alerts from "./pages/Alerts";
import Incidents from "./pages/Incidents";
import FederatedLearning from "./pages/FederatedLearning";
import Blockchain from "./pages/Blockchain";
import Collaboration from "./pages/Collaboration";
import Compliance from "./pages/Compliance";
import Settings from "./pages/Settings";

// Layout Components
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

// Protected Route Component
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 p-6">
        <Outlet />
      </main>
    </div>
  );
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/threats" element={<Threats />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/federated" element={<FederatedLearning />} />
              <Route path="/blockchain" element={<Blockchain />} />
              <Route path="/collaboration" element={<Collaboration />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
