import { query } from "../config/db.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAdminAuth(request, _response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new ApiError(401, "Authorization token is required"));
    return;
  }

  if (token === "local-dev-admin-token" && env.nodeEnv !== "production" && env.allowLocalDevAdmin) {
    request.admin = {
      id: null,
      fullName: "Local Dev Admin",
      email: "sourab@thedoveberry.com",
      role: "super_admin",
      isActive: true
    };
    next();
    return;
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    next(new ApiError(401, "Admin session is invalid"));
    return;
  }
  const admins = await query(
    "SELECT id, full_name AS fullName, email, role, status, is_active AS isActive FROM admins WHERE id = ? LIMIT 1",
    [payload.adminId]
  );
  const admin = admins[0];

  if (!admin || !admin.isActive || admin.status !== "active") {
    next(new ApiError(401, "Admin session is no longer valid"));
    return;
  }

  request.admin = admin;
  next();
}

export async function requireCustomerAuth(request, _response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new ApiError(401, "Customer authorization token is required"));
    return;
  }

  const payload = verifyToken(token);
  if (payload.tokenType !== "customer" || !payload.customerId) {
    next(new ApiError(401, "Customer session is invalid"));
    return;
  }

  const customers = await query(
    "SELECT id, full_name AS fullName, email, phone, city, state, status FROM customers WHERE id = ? LIMIT 1",
    [payload.customerId]
  );
  const customer = customers[0];

  if (!customer || customer.status !== "active") {
    next(new ApiError(401, "Customer session is no longer valid"));
    return;
  }

  request.customer = customer;
  next();
}

export async function optionalCustomerAuth(request, _response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    if (payload.tokenType !== "customer" || !payload.customerId) {
      next();
      return;
    }

    const customers = await query(
      "SELECT id, full_name AS fullName, email, phone, city, state, status FROM customers WHERE id = ? LIMIT 1",
      [payload.customerId]
    );
    const customer = customers[0];
    if (customer && customer.status === "active") request.customer = customer;
  } catch {
    // Guest checkout remains available when a customer token is absent or stale.
  }

  next();
}
