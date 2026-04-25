import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <Routes>
      <Route path="/dashboard/*" element={<AppRoutes />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
