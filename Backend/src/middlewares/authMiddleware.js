import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAdminAuth(request, _response, next) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new ApiError(401, "Authorization token is required"));
    return;
  }

  const payload = verifyToken(token);
  const admins = await query(
    "SELECT id, full_name AS fullName, email, role, is_active AS isActive FROM admins WHERE id = ? LIMIT 1",
    [payload.adminId]
  );
  const admin = admins[0];

  if (!admin || !admin.isActive) {
    next(new ApiError(401, "Admin session is no longer valid"));
    return;
  }

  request.admin = admin;
  next();
}
