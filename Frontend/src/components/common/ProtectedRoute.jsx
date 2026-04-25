import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ allow, redirectTo = "/account", children }) {
  return allow ? children : <Navigate to={redirectTo} replace />;
}
