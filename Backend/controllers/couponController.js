import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

let schemaReady = false;

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeDiscountType(value) {
  return value === "fixed" ? "fixed" : "percentage";
}

function toDashboardDiscountType(value) {
  return value === "fixed" ? "fixed" : "percent";
}

function normalizeStatus(value) {
  const status = String(value || "active").trim().toLowerCase();
  return ["active", "scheduled", "paused", "expired", "inactive"].includes(status) ? status : "active";
}

function toDateInput(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateTime(value, endOfDay = false) {
  if (!value) return null;
  return `${String(value).slice(0, 10)} ${endOfDay ? "23:59:59" : "00:00:00"}`;
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  return ["true", "1", "yes", "on"].includes(normalized);
}

async function ensureCouponSchema() {
  if (schemaReady) return;

  await query("ALTER TABLE coupons MODIFY status ENUM('active', 'scheduled', 'paused', 'expired', 'inactive') NOT NULL DEFAULT 'active'");

  const columns = await query("SHOW COLUMNS FROM coupons");
  const existing = new Set(columns.map((column) => column.Field));
  const additions = [
    ["customer_eligibility", "ALTER TABLE coupons ADD COLUMN customer_eligibility ENUM('all', 'new', 'returning') NOT NULL DEFAULT 'all'"],
    ["one_use_per_customer", "ALTER TABLE coupons ADD COLUMN one_use_per_customer TINYINT(1) NOT NULL DEFAULT 1"],
    ["stackable", "ALTER TABLE coupons ADD COLUMN stackable TINYINT(1) NOT NULL DEFAULT 0"],
    ["auto_apply", "ALTER TABLE coupons ADD COLUMN auto_apply TINYINT(1) NOT NULL DEFAULT 0"]
  ];

  for (const [column, statement] of additions) {
    if (!existing.has(column)) {
      await query(statement);
    }
  }

  schemaReady = true;
}

async function getCategoryIdsByNames(categoryNames = []) {
  const names = [...new Set(categoryNames.map((name) => String(name || "").trim()).filter(Boolean))];
  if (!names.length) return [];

  const placeholders = names.map(() => "?").join(", ");
  const rows = await query(
    `SELECT id, name, slug FROM categories WHERE name IN (${placeholders}) OR slug IN (${placeholders})`,
    [...names, ...names]
  );
  return rows.map((row) => Number(row.id));
}

async function replaceCouponCategories(couponId, eligibleCategories = []) {
  await query("DELETE FROM coupon_categories WHERE coupon_id = ?", [couponId]);
  const categoryIds = await getCategoryIdsByNames(eligibleCategories);

  for (const categoryId of categoryIds) {
    await query(
      "INSERT IGNORE INTO coupon_categories (coupon_id, category_id) VALUES (?, ?)",
      [couponId, categoryId]
    );
  }
}

function validateCouponPayload(payload = {}, existingCouponId = null) {
  const code = normalizeCode(payload.code);
  const title = String(payload.title || "").trim();
  const discountType = normalizeDiscountType(payload.discountType);
  const discountValue = Number(payload.discountValue || 0);
  const minSubtotal = Number(payload.minSubtotal ?? payload.minimumOrderAmount ?? 0);
  const maxDiscount = Number(payload.maxDiscount ?? payload.maximumDiscountAmount ?? 0);
  const usageLimit = Number(payload.usageLimit || 0);
  const usedCount = Number(payload.usedCount || 0);
  const startDate = String(payload.startDate || "").slice(0, 10);
  const endDate = String(payload.endDate || "").slice(0, 10);

  if (!code || !/^[A-Z0-9_-]{3,24}$/.test(code)) {
    throw new ApiError(400, "Coupon code must use 3-24 letters, numbers, underscores, or hyphens");
  }
  if (!title) throw new ApiError(400, "Coupon title is required");
  if (discountValue <= 0) throw new ApiError(400, "Discount value must be greater than zero");
  if (discountType === "percentage" && discountValue > 90) {
    throw new ApiError(400, "Percentage discount cannot be more than 90%");
  }
  if (minSubtotal < 0 || maxDiscount < 0) throw new ApiError(400, "Amount fields cannot be negative");
  if (discountType === "percentage" && maxDiscount <= 0) {
    throw new ApiError(400, "Maximum discount is required for percentage coupons");
  }
  if (!startDate || !endDate) throw new ApiError(400, "Start date and end date are required");
  if (new Date(endDate) < new Date(startDate)) throw new ApiError(400, "End date must be after start date");
  if (usageLimit <= 0) throw new ApiError(400, "Usage limit must be greater than zero");
  if (usedCount < 0) throw new ApiError(400, "Used count cannot be negative");

  return {
    existingCouponId,
    code,
    title,
    description: String(payload.description || "").trim(),
    discountType,
    discountValue,
    minSubtotal,
    maxDiscount,
    usageLimit,
    usedCount,
    startDate,
    endDate,
    status: normalizeStatus(payload.status),
    customerEligibility: ["all", "new", "returning"].includes(payload.customerEligibility) ? payload.customerEligibility : "all",
    oneUsePerCustomer: parseBoolean(payload.oneUsePerCustomer, true),
    stackable: parseBoolean(payload.stackable, false),
    autoApply: parseBoolean(payload.autoApply, false),
    eligibleCategories: Array.isArray(payload.eligibleCategories) ? payload.eligibleCategories : []
  };
}

async function assertUniqueCode(code, excludedId = null) {
  const rows = excludedId
    ? await query("SELECT id FROM coupons WHERE code = ? AND id != ? LIMIT 1", [code, excludedId])
    : await query("SELECT id FROM coupons WHERE code = ? LIMIT 1", [code]);

  if (rows.length) throw new ApiError(409, "A coupon with this code already exists");
}

function mapCouponRow(row, categoriesByCouponId) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description || "",
    discountType: toDashboardDiscountType(row.discountType),
    discountValue: Number(row.discountValue || 0),
    maxDiscount: Number(row.maxDiscount || 0),
    minSubtotal: Number(row.minSubtotal || 0),
    eligibleCategories: categoriesByCouponId.get(Number(row.id)) || [],
    usageLimit: Number(row.usageLimit || 0),
    usedCount: Number(row.usedCount || 0),
    startDate: toDateInput(row.startDate),
    endDate: toDateInput(row.endDate),
    status: normalizeStatus(row.status),
    customerEligibility: row.customerEligibility || "all",
    oneUsePerCustomer: Boolean(row.oneUsePerCustomer),
    stackable: Boolean(row.stackable),
    autoApply: Boolean(row.autoApply),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function getCouponsWithCategories(whereClause = "", values = []) {
  await ensureCouponSchema();

  const rows = await query(
    `SELECT
      id,
      code,
      title,
      description,
      discount_type AS discountType,
      discount_value AS discountValue,
      minimum_order_amount AS minSubtotal,
      maximum_discount_amount AS maxDiscount,
      usage_limit AS usageLimit,
      used_count AS usedCount,
      starts_at AS startDate,
      ends_at AS endDate,
      status,
      customer_eligibility AS customerEligibility,
      one_use_per_customer AS oneUsePerCustomer,
      stackable,
      auto_apply AS autoApply,
      created_at AS createdAt,
      updated_at AS updatedAt
     FROM coupons
     ${whereClause}
     ORDER BY created_at DESC, id DESC`,
    values
  );

  const couponIds = rows.map((row) => Number(row.id));
  const categoriesByCouponId = new Map();
  if (couponIds.length) {
    const placeholders = couponIds.map(() => "?").join(", ");
    const categoryRows = await query(
      `SELECT cc.coupon_id AS couponId, c.name, c.slug
       FROM coupon_categories cc
       JOIN categories c ON c.id = cc.category_id
       WHERE cc.coupon_id IN (${placeholders})
       ORDER BY c.name ASC`,
      couponIds
    );
    categoryRows.forEach((row) => {
      const list = categoriesByCouponId.get(Number(row.couponId)) || [];
      list.push(row.name);
      if (row.slug && row.slug !== row.name) list.push(row.slug);
      categoriesByCouponId.set(Number(row.couponId), list);
    });
  }

  return rows.map((row) => mapCouponRow(row, categoriesByCouponId));
}

export async function listCoupons(request, response) {
  const filters = [];
  const values = [];
  const status = String(request.query.status || "").trim();
  const search = String(request.query.search || "").trim();

  if (status && status !== "all") {
    filters.push("status = ?");
    values.push(normalizeStatus(status));
  }

  if (search) {
    filters.push("(code LIKE ? OR title LIKE ? OR description LIKE ?)");
    const term = `%${search}%`;
    values.push(term, term, term);
  }

  const coupons = await getCouponsWithCategories(filters.length ? `WHERE ${filters.join(" AND ")}` : "", values);
  response.json({ success: true, count: coupons.length, data: coupons });
}

export async function getCouponById(request, response) {
  const coupons = await getCouponsWithCategories("WHERE id = ? OR code = ?", [Number(request.params.id) || 0, normalizeCode(request.params.id)]);
  if (!coupons.length) throw new ApiError(404, "Coupon not found");
  response.json({ success: true, data: coupons[0] });
}

export async function createCoupon(request, response) {
  await ensureCouponSchema();
  const payload = validateCouponPayload(request.body || {});
  await assertUniqueCode(payload.code);

  const result = await query(
    `INSERT INTO coupons
      (code, title, description, discount_type, discount_value, minimum_order_amount, maximum_discount_amount,
       usage_limit, used_count, starts_at, ends_at, status, customer_eligibility, one_use_per_customer, stackable, auto_apply)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code,
      payload.title,
      payload.description,
      payload.discountType,
      payload.discountValue,
      payload.minSubtotal,
      payload.maxDiscount,
      payload.usageLimit,
      payload.usedCount,
      toDateTime(payload.startDate),
      toDateTime(payload.endDate, true),
      payload.status,
      payload.customerEligibility,
      payload.oneUsePerCustomer ? 1 : 0,
      payload.stackable ? 1 : 0,
      payload.autoApply ? 1 : 0
    ]
  );
  await replaceCouponCategories(result.insertId, payload.eligibleCategories);

  const [created] = await getCouponsWithCategories("WHERE id = ?", [result.insertId]);
  response.status(201).json({ success: true, message: "Coupon created successfully", data: created });
}

export async function updateCoupon(request, response) {
  await ensureCouponSchema();
  const couponId = Number(request.params.id);
  if (!Number.isInteger(couponId) || couponId <= 0) throw new ApiError(400, "Invalid coupon id");

  const existing = await query("SELECT id FROM coupons WHERE id = ? LIMIT 1", [couponId]);
  if (!existing.length) throw new ApiError(404, "Coupon not found");

  const payload = validateCouponPayload(request.body || {}, couponId);
  await assertUniqueCode(payload.code, couponId);

  await query(
    `UPDATE coupons
     SET code = ?,
         title = ?,
         description = ?,
         discount_type = ?,
         discount_value = ?,
         minimum_order_amount = ?,
         maximum_discount_amount = ?,
         usage_limit = ?,
         used_count = ?,
         starts_at = ?,
         ends_at = ?,
         status = ?,
         customer_eligibility = ?,
         one_use_per_customer = ?,
         stackable = ?,
         auto_apply = ?
     WHERE id = ?`,
    [
      payload.code,
      payload.title,
      payload.description,
      payload.discountType,
      payload.discountValue,
      payload.minSubtotal,
      payload.maxDiscount,
      payload.usageLimit,
      payload.usedCount,
      toDateTime(payload.startDate),
      toDateTime(payload.endDate, true),
      payload.status,
      payload.customerEligibility,
      payload.oneUsePerCustomer ? 1 : 0,
      payload.stackable ? 1 : 0,
      payload.autoApply ? 1 : 0,
      couponId
    ]
  );
  await replaceCouponCategories(couponId, payload.eligibleCategories);

  const [updated] = await getCouponsWithCategories("WHERE id = ?", [couponId]);
  response.json({ success: true, message: "Coupon updated successfully", data: updated });
}

export async function updateCouponStatus(request, response) {
  await ensureCouponSchema();
  const couponId = Number(request.params.id);
  const status = normalizeStatus(request.body?.status);

  const result = await query("UPDATE coupons SET status = ? WHERE id = ?", [status, couponId]);
  if (!result.affectedRows) throw new ApiError(404, "Coupon not found");

  const [updated] = await getCouponsWithCategories("WHERE id = ?", [couponId]);
  response.json({ success: true, message: "Coupon status updated", data: updated });
}

export async function deleteCoupon(request, response) {
  await ensureCouponSchema();
  const couponId = Number(request.params.id);
  const result = await query("DELETE FROM coupons WHERE id = ?", [couponId]);
  if (!result.affectedRows) throw new ApiError(404, "Coupon not found");
  response.json({ success: true, message: "Coupon deleted successfully" });
}
