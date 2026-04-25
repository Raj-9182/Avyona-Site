import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { slugify } from "../utils/slugify.js";

export async function listProducts(request, response) {
  const filters = [];
  const values = [];

  if (request.query.categoryId) {
    filters.push("p.category_id = ?");
    values.push(Number(request.query.categoryId));
  }

  if (request.query.status) {
    filters.push("p.status = ?");
    values.push(String(request.query.status));
  }

  if (request.query.search) {
    filters.push("(p.name LIKE ? OR p.brand LIKE ? OR p.slug LIKE ? OR p.asin LIKE ?)");
    const term = `%${String(request.query.search).trim()}%`;
    values.push(term, term, term, term);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const rows = await query(
    `SELECT
      p.id,
      p.category_id AS categoryId,
      p.variant_group_id AS variantGroupDbId,
      vg.group_id AS variantGroupId,
      c.name AS categoryName,
      p.asin,
      p.name,
      p.slug,
      p.brand,
      p.short_description AS shortDescription,
      p.price,
      p.mrp,
      p.stock_quantity AS stockQuantity,
      p.rating,
      p.review_count AS reviewCount,
      p.image_url AS imageUrl,
      p.status,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN variant_groups vg ON vg.id = p.variant_group_id
     ${whereClause}
     ORDER BY p.created_at DESC`,
    values
  );

  response.json({
    success: true,
    count: rows.length,
    data: rows
  });
}

export async function getProductById(request, response) {
  const rows = await query(
    `SELECT
      p.id,
      p.category_id AS categoryId,
      p.variant_group_id AS variantGroupDbId,
      vg.group_id AS variantGroupId,
      c.name AS categoryName,
      p.asin,
      p.name,
      p.slug,
      p.brand,
      p.short_description AS shortDescription,
      p.description,
      p.price,
      p.mrp,
      p.stock_quantity AS stockQuantity,
      p.rating,
      p.review_count AS reviewCount,
      p.image_url AS imageUrl,
      p.status,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN variant_groups vg ON vg.id = p.variant_group_id
     WHERE p.id = ?
     LIMIT 1`,
    [Number(request.params.id)]
  );

  if (!rows.length) {
    throw new ApiError(404, "Product not found");
  }

  response.json({
    success: true,
    data: rows[0]
  });
}

export async function createProduct(request, response) {
  const {
    categoryId,
    asin,
    name,
    brand,
    shortDescription = "",
    description = "",
    price,
    mrp,
    stockQuantity = 0,
    rating = 0,
    reviewCount = 0,
    imageUrl = "",
    status = "draft"
  } = request.body || {};

  if (!categoryId || !asin || !name || !brand || price == null || mrp == null) {
    throw new ApiError(400, "categoryId, asin, name, brand, price, and mrp are required");
  }

  const slug = slugify(name);

  const result = await query(
    `INSERT INTO products
      (category_id, asin, name, slug, brand, short_description, description, price, mrp, stock_quantity, rating, review_count, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [categoryId, String(asin).trim(), name, slug, brand, shortDescription, description, price, mrp, stockQuantity, rating, reviewCount, imageUrl, status]
  );

  const created = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [result.insertId]);

  response.status(201).json({
    success: true,
    data: created[0]
  });
}

export async function updateProduct(request, response) {
  const {
    categoryId,
    asin,
    name,
    brand,
    shortDescription,
    description,
    price,
    mrp,
    stockQuantity,
    rating,
    reviewCount,
    imageUrl,
    status
  } = request.body || {};

  const existing = await query("SELECT id, name FROM products WHERE id = ? LIMIT 1", [Number(request.params.id)]);
  if (!existing.length) {
    throw new ApiError(404, "Product not found");
  }

  const nextName = name || existing[0].name;
  await query(
    `UPDATE products
     SET
      category_id = COALESCE(?, category_id),
      asin = COALESCE(?, asin),
      name = COALESCE(?, name),
      slug = ?,
      brand = COALESCE(?, brand),
      short_description = COALESCE(?, short_description),
      description = COALESCE(?, description),
      price = COALESCE(?, price),
      mrp = COALESCE(?, mrp),
      stock_quantity = COALESCE(?, stock_quantity),
      rating = COALESCE(?, rating),
      review_count = COALESCE(?, review_count),
      image_url = COALESCE(?, image_url),
      status = COALESCE(?, status)
     WHERE id = ?`,
    [
      categoryId ?? null,
      asin ? String(asin).trim() : null,
      name ?? null,
      slugify(nextName),
      brand ?? null,
      shortDescription ?? null,
      description ?? null,
      price ?? null,
      mrp ?? null,
      stockQuantity ?? null,
      rating ?? null,
      reviewCount ?? null,
      imageUrl ?? null,
      status ?? null,
      Number(request.params.id)
    ]
  );

  const updated = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [Number(request.params.id)]);

  response.json({
    success: true,
    data: updated[0]
  });
}

export async function deleteProduct(request, response) {
  const result = await query("DELETE FROM products WHERE id = ?", [Number(request.params.id)]);

  if (!result.affectedRows) {
    throw new ApiError(404, "Product not found");
  }

  response.json({
    success: true,
    message: "Product deleted successfully"
  });
}
