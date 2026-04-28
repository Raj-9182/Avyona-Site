import fs from "fs/promises";
import path from "path";
import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { slugify } from "../utils/slugify.js";

const localProductsPath = path.resolve(process.cwd(), "data", "local-products.json");

function isDatabaseUnavailable(error) {
  return ["ECONNREFUSED", "ER_NO_SUCH_TABLE", "ER_BAD_DB_ERROR", "PROTOCOL_CONNECTION_LOST"].includes(error?.code);
}

async function readLocalProducts() {
  try {
    const raw = await fs.readFile(localProductsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalProducts(products) {
  await fs.mkdir(path.dirname(localProductsPath), { recursive: true });
  await fs.writeFile(localProductsPath, JSON.stringify(products, null, 2));
}

function normalizeLocalProduct(payload) {
  const now = new Date().toISOString();
  const price = Number(payload.price || 0);
  const mrp = Number(payload.mrp || price || 0);
  const categorySlug = payload.categorySlug || "products";

  return {
    id: Date.now(),
    categoryId: null,
    categoryName: categorySlug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    categorySlug,
    variantGroupDbId: null,
    variantGroupId: null,
    asin: String(payload.asin || `AVY-${Date.now()}`).trim(),
    name: payload.name,
    slug: payload.slug ? slugify(payload.slug) : slugify(payload.name),
    brand: payload.brand,
    shortDescription: payload.shortDescription || "",
    description: payload.description || "",
    price,
    mrp,
    stockQuantity: Number(payload.stockQuantity || 0),
    rating: Number(payload.rating || 0),
    reviewCount: Number(payload.reviewCount || 0),
    imageUrl: payload.imageUrl || "",
    status: payload.status || "draft",
    createdAt: now,
    updatedAt: now
  };
}

function filterLocalProducts(products, request) {
  const search = String(request.query.search || "").trim().toLowerCase();
  const status = String(request.query.status || "").trim();

  return products
    .filter((product) => !status || product.status === status)
    .filter((product) => {
      if (!search) return true;
      return [product.name, product.brand, product.slug, product.asin, product.categoryName]
        .some((value) => String(value || "").toLowerCase().includes(search));
    })
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
}

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
  try {
    const rows = await query(
      `SELECT
      p.id,
      p.category_id AS categoryId,
      p.variant_group_id AS variantGroupDbId,
      vg.group_id AS variantGroupId,
      c.name AS categoryName,
      c.slug AS categorySlug,
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
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const rows = filterLocalProducts(await readLocalProducts(), request);
    response.json({
      success: true,
      count: rows.length,
      data: rows,
      source: "local-file"
    });
  }
}

export async function getProductById(request, response) {
  let rows;
  try {
    rows = await query(
    `SELECT
      p.id,
      p.category_id AS categoryId,
      p.variant_group_id AS variantGroupDbId,
      vg.group_id AS variantGroupId,
      c.name AS categoryName,
      c.slug AS categorySlug,
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
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const products = await readLocalProducts();
    const product = products.find((item) => String(item.id) === String(request.params.id) || item.slug === request.params.id || item.asin === request.params.id);
    if (!product) throw new ApiError(404, "Product not found");
    response.json({ success: true, data: product });
    return;
  }

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
    categorySlug,
    asin,
    name,
    slug,
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

  if ((!categoryId && !categorySlug) || !asin || !name || !brand || price == null || mrp == null) {
    throw new ApiError(400, "categoryId/categorySlug, asin, name, brand, price, and mrp are required");
  }

  try {
    let resolvedCategoryId = categoryId ? Number(categoryId) : null;
    if (!resolvedCategoryId && categorySlug) {
      const categories = await query("SELECT id FROM categories WHERE slug = ? LIMIT 1", [categorySlug]);
      resolvedCategoryId = categories[0]?.id || null;
    }

    if (!resolvedCategoryId) {
      throw new ApiError(400, "A valid product category is required");
    }

    const productSlug = slug ? slugify(slug) : slugify(name);

    const result = await query(
      `INSERT INTO products
      (category_id, asin, name, slug, brand, short_description, description, price, mrp, stock_quantity, rating, review_count, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [resolvedCategoryId, String(asin).trim(), name, productSlug, brand, shortDescription, description, price, mrp, stockQuantity, rating, reviewCount, imageUrl, status]
    );

    const created = await query("SELECT * FROM products WHERE id = ? LIMIT 1", [result.insertId]);

    response.status(201).json({
      success: true,
      data: created[0]
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const products = await readLocalProducts();
    const created = normalizeLocalProduct(request.body || {});
    const nextProducts = [created, ...products.filter((product) => product.slug !== created.slug && product.asin !== created.asin)];
    await writeLocalProducts(nextProducts);
    response.status(201).json({
      success: true,
      data: created,
      source: "local-file"
    });
  }
}

export async function updateProduct(request, response) {
  const {
    categoryId,
    categorySlug,
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

  try {
    const existing = await query("SELECT id, name FROM products WHERE id = ? LIMIT 1", [Number(request.params.id)]);
    if (!existing.length) {
      throw new ApiError(404, "Product not found");
    }

    let resolvedCategoryId = categoryId ? Number(categoryId) : null;
    if (!resolvedCategoryId && categorySlug) {
      const categories = await query("SELECT id FROM categories WHERE slug = ? LIMIT 1", [categorySlug]);
      resolvedCategoryId = categories[0]?.id || null;
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
        resolvedCategoryId ?? null,
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
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;

    const products = await readLocalProducts();
    const index = products.findIndex((item) => String(item.id) === String(request.params.id) || item.slug === request.params.id || item.asin === request.params.id);
    if (index === -1) {
      throw new ApiError(404, "Product not found");
    }

    const current = products[index];
    const nextName = name ?? current.name;
    const updated = {
      ...current,
      categorySlug: categorySlug ?? current.categorySlug,
      categoryId: categoryId ?? current.categoryId,
      asin: asin ? String(asin).trim() : current.asin,
      name: nextName,
      slug: slug ? slugify(slug) : slugify(nextName),
      brand: brand ?? current.brand,
      shortDescription: shortDescription ?? current.shortDescription,
      description: description ?? current.description,
      price: price ?? current.price,
      mrp: mrp ?? current.mrp,
      stockQuantity: stockQuantity ?? current.stockQuantity,
      rating: rating ?? current.rating,
      reviewCount: reviewCount ?? current.reviewCount,
      imageUrl: imageUrl ?? current.imageUrl,
      status: status ?? current.status,
      updatedAt: new Date().toISOString()
    };

    const nextProducts = [...products];
    nextProducts[index] = updated;
    await writeLocalProducts(nextProducts);

    response.json({
      success: true,
      data: updated,
      source: "local-file"
    });
  }
}

export async function deleteProduct(request, response) {
  try {
    const result = await query("DELETE FROM products WHERE id = ?", [Number(request.params.id)]);

    if (!result.affectedRows) {
      throw new ApiError(404, "Product not found");
    }

    response.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;

    const products = await readLocalProducts();
    const nextProducts = products.filter((item) => String(item.id) !== String(request.params.id) && item.slug !== request.params.id && item.asin !== request.params.id);
    if (nextProducts.length === products.length) {
      throw new ApiError(404, "Product not found");
    }

    await writeLocalProducts(nextProducts);

    response.json({
      success: true,
      message: "Product deleted successfully",
      source: "local-file"
    });
  }
}
