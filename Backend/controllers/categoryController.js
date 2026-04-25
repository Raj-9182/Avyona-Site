import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const CATEGORY_SELECT = `SELECT
  c.id,
  c.name,
  c.slug,
  c.parent_id AS parentId,
  parent.name AS parentCategory,
  CASE
    WHEN c.parent_id IS NULL THEN 'main_category'
    ELSE 'subcategory'
  END AS categoryType,
  (
    SELECT COUNT(*)
    FROM categories child
    WHERE child.parent_id = c.id
  ) AS childCount,
  (
    SELECT COUNT(*)
    FROM products product
    WHERE product.category_id = c.id
  ) AS productCount,
  c.description,
  c.image_url AS imageUrl,
  c.banner_image_url AS bannerImageUrl,
  c.icon_url AS iconUrl,
  c.status,
  c.show_in_menu AS showInMenu,
  c.featured_category AS featuredCategory,
  c.category_discount_label AS categoryDiscountLabel,
  c.dynamic_rule_json AS dynamicRuleJson,
  c.sort_order AS sortOrder,
  c.meta_title AS metaTitle,
  c.meta_description AS metaDescription,
  c.meta_keywords AS keywords,
  c.is_active AS isActive,
  c.created_at AS createdAt,
  c.updated_at AS updatedAt
 FROM categories c
 LEFT JOIN categories parent ON parent.id = c.parent_id`;

function parseCategoryId(value, fieldName = "category id") {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }

  return id;
}

function toNullableString(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function toSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

function normalizeCategoryPayload(payload = {}) {
  const name = String(payload.name || "").trim();
  const slug = toSlug(payload.slug || payload.name || "");
  const parentIdValue = payload.parentId === "" || payload.parentId === null || payload.parentId === undefined
    ? null
    : Number(payload.parentId);
  const sortOrderValue = payload.sortOrder === "" || payload.sortOrder === null || payload.sortOrder === undefined
    ? 0
    : Number(payload.sortOrder);
  const status = String(payload.status || "active").trim().toLowerCase() === "inactive" ? "inactive" : "active";

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  if (!slug) {
    throw new ApiError(400, "Category slug is required");
  }

  if (parentIdValue !== null && (!Number.isInteger(parentIdValue) || parentIdValue <= 0)) {
    throw new ApiError(400, "Parent category must be a valid category id");
  }

  if (!Number.isFinite(sortOrderValue)) {
    throw new ApiError(400, "Sort order must be a valid number");
  }

  return {
    name,
    slug,
    parentId: parentIdValue,
    imageUrl: toNullableString(payload.imageUrl || payload.image),
    bannerImageUrl: toNullableString(payload.bannerImageUrl || payload.banner),
    description: toNullableString(payload.description),
    status,
    showInMenu: parseBoolean(payload.showInMenu, true),
    featuredCategory: parseBoolean(payload.featuredCategory ?? payload.isFeatured, false),
    sortOrder: Math.max(0, Math.round(sortOrderValue)),
    metaTitle: toNullableString(payload.metaTitle),
    metaDescription: toNullableString(payload.metaDescription),
    keywords: toNullableString(payload.keywords),
    isActive: status === "active"
  };
}

async function getCategoryRowById(categoryId) {
  const rows = await query(
    `${CATEGORY_SELECT}
     WHERE c.id = ?
     LIMIT 1`,
    [categoryId]
  );

  return rows[0] || null;
}

async function ensureParentCategoryExists(parentId, excludedCategoryId = null) {
  if (parentId === null) return;

  if (excludedCategoryId !== null && parentId === excludedCategoryId) {
    throw new ApiError(400, "A category cannot be its own parent");
  }

  const parentRows = await query(
    "SELECT id FROM categories WHERE id = ? LIMIT 1",
    [parentId]
  );

  if (!parentRows[0]) {
    throw new ApiError(404, "Parent category not found");
  }
}

async function ensureUniqueSlug(slug, excludedCategoryId = null) {
  const rows = excludedCategoryId === null
    ? await query("SELECT id FROM categories WHERE slug = ? LIMIT 1", [slug])
    : await query("SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1", [slug, excludedCategoryId]);

  if (rows[0]) {
    throw new ApiError(409, "Category slug already exists");
  }
}

function buildCategoryTree(rows) {
  const byId = new Map();
  const roots = [];

  rows.forEach((row) => {
    byId.set(row.id, {
      ...row,
      children: []
    });
  });

  rows.forEach((row) => {
    const current = byId.get(row.id);

    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId).children.push(current);
      return;
    }

    roots.push(current);
  });

  return roots;
}

export async function createCategory(request, response) {
  const payload = normalizeCategoryPayload(request.body);

  await ensureParentCategoryExists(payload.parentId);
  await ensureUniqueSlug(payload.slug);

  const result = await query(
    `INSERT INTO categories (
      name,
      slug,
      parent_id,
      description,
      image_url,
      banner_image_url,
      status,
      show_in_menu,
      featured_category,
      sort_order,
      meta_title,
      meta_description,
      meta_keywords,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.name,
      payload.slug,
      payload.parentId,
      payload.description,
      payload.imageUrl,
      payload.bannerImageUrl,
      payload.status,
      payload.showInMenu ? 1 : 0,
      payload.featuredCategory ? 1 : 0,
      payload.sortOrder,
      payload.metaTitle,
      payload.metaDescription,
      payload.keywords,
      payload.isActive ? 1 : 0
    ]
  );

  const category = await getCategoryRowById(result.insertId);

  response.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category
  });
}

export async function listCategories(_request, response) {
  const rows = await query(
    `${CATEGORY_SELECT}
     ORDER BY COALESCE(parent.sort_order, c.sort_order) ASC, c.parent_id IS NOT NULL ASC, c.sort_order ASC, c.name ASC`
  );

  response.json({
    success: true,
    count: rows.length,
    data: rows
  });
}

export async function getCategoryTree(_request, response) {
  const rows = await query(
    `${CATEGORY_SELECT}
     ORDER BY COALESCE(parent.sort_order, c.sort_order) ASC, c.parent_id IS NOT NULL ASC, c.sort_order ASC, c.name ASC`
  );

  response.json({
    success: true,
    count: rows.length,
    data: buildCategoryTree(rows)
  });
}

export async function getCategoryById(request, response) {
  const categoryId = parseCategoryId(request.params.id);
  const category = await getCategoryRowById(categoryId);

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  response.json({
    success: true,
    data: category
  });
}

export async function updateCategory(request, response) {
  const categoryId = parseCategoryId(request.params.id);
  const existingCategory = await getCategoryRowById(categoryId);

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  const payload = normalizeCategoryPayload(request.body);

  await ensureParentCategoryExists(payload.parentId, categoryId);
  await ensureUniqueSlug(payload.slug, categoryId);

  await query(
    `UPDATE categories
     SET
       name = ?,
       slug = ?,
       parent_id = ?,
       description = ?,
       image_url = ?,
       banner_image_url = ?,
       status = ?,
       show_in_menu = ?,
       featured_category = ?,
       sort_order = ?,
       meta_title = ?,
       meta_description = ?,
       meta_keywords = ?,
       is_active = ?
     WHERE id = ?`,
    [
      payload.name,
      payload.slug,
      payload.parentId,
      payload.description,
      payload.imageUrl,
      payload.bannerImageUrl,
      payload.status,
      payload.showInMenu ? 1 : 0,
      payload.featuredCategory ? 1 : 0,
      payload.sortOrder,
      payload.metaTitle,
      payload.metaDescription,
      payload.keywords,
      payload.isActive ? 1 : 0,
      categoryId
    ]
  );

  const category = await getCategoryRowById(categoryId);

  response.json({
    success: true,
    message: "Category updated successfully",
    data: category
  });
}

export async function deleteCategory(request, response) {
  const categoryId = parseCategoryId(request.params.id);
  const existingCategory = await getCategoryRowById(categoryId);

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  const childRows = await query(
    "SELECT COUNT(*) AS totalChildren FROM categories WHERE parent_id = ?",
    [categoryId]
  );
  const productRows = await query(
    "SELECT COUNT(*) AS totalProducts FROM products WHERE category_id = ?",
    [categoryId]
  );

  if (Number(childRows[0]?.totalChildren || 0) > 0) {
    throw new ApiError(400, "Cannot delete a category that still has subcategories");
  }

  if (Number(productRows[0]?.totalProducts || 0) > 0) {
    throw new ApiError(400, "Cannot delete a category that still has linked products");
  }

  await query("DELETE FROM categories WHERE id = ? LIMIT 1", [categoryId]);

  response.json({
    success: true,
    message: "Category deleted successfully"
  });
}
