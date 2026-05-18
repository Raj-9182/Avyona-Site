import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function getJwtSecret() {
  if (env.nodeEnv === "production") {
    const isDefaultSecret = env.jwtSecret === "change_this_to_a_long_secure_secret";
    if (isDefaultSecret || String(env.jwtSecret || "").length < 32) {
      throw new Error("JWT_SECRET must be configured with at least 32 characters before running in production");
    }
  }

  return env.jwtSecret;
}

export function signAdminToken(admin) {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role
    },
    getJwtSecret(),
    { expiresIn: env.jwtExpiresIn }
  );
}

export function signCustomerToken(customer) {
  return jwt.sign(
    {
      customerId: customer.id,
      email: customer.email,
      tokenType: "customer"
    },
    getJwtSecret(),
    { expiresIn: env.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}
