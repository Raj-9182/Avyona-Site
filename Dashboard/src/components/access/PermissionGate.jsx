import React from "react";
import { canAccess } from "../../utils/accessControl";

export default function PermissionGate({ module, action = "view", children, fallback = null }) {
  if (!canAccess(module, action)) return fallback;
  return <>{children}</>;
}
