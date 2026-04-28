import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import Login from "./pages/auth/Login";
import { getAdminToken } from "./api/adminApi";

function ProtectedDashboard() {
  return getAdminToken() ? <AppRoutes /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<ProtectedDashboard />} />
      <Route path="/homepage/hero-banner" element={<Navigate to="/dashboard/homepage/hero-banner" replace />} />
      <Route path="/homepage/browse-categories" element={<Navigate to="/dashboard/homepage/browse-categories" replace />} />
      <Route path="/homepage/our-products" element={<Navigate to="/dashboard/homepage/our-products" replace />} />
      <Route path="/homepage/best-sellers" element={<Navigate to="/dashboard/homepage/best-sellers" replace />} />
      <Route path="/homepage/new-arrivals" element={<Navigate to="/dashboard/homepage/new-arrivals" replace />} />
      <Route path="/homepage/featured-brands" element={<Navigate to="/dashboard/homepage/featured-brands" replace />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
