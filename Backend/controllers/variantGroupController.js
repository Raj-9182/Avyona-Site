import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeProducts(products) {
  if (!Array.isArray(products)) return [];
  return [...new Set(products.map((item) => normalizeString(item)).filter(Boolean))];
}

async function attachGroupId(groupDbId) {
  const groupId = `GRP${String(groupDbId).padStart(4, "0")}`;
  await query("UPDATE variant_groups SET group_id = ? WHERE id = ? LIMIT 1", [groupId, groupDbId]);
  return groupId;
}

async function getVariantGroupByDbId(groupDbId) {
  const rows = await query(
    `SELECT
      vg.id,
      vg.group_id AS groupId,
      vg.group_name AS groupName,
      vg.variant_type AS variantType,
      vg.status,
      p.asin,
      p.name AS productName
     FROM variant_groups vg
     LEFT JOIN variant_group_products vgp ON vgp.variant_group_id = vg.id
     LEFT JOIN products p ON p.id = vgp.product_id
     WHERE vg.id = ?
     ORDER BY p.name ASC`,
    [groupDbId]
  );

  if (!rows.length) {
    return null;
  }

  return {
    groupId: rows[0].groupId,
    groupName: rows[0].groupName,
    variantType: rows[0].variantType,
    status: rows[0].status,
    products: rows.filter((row) => row.asin).map((row) => row.asin),
    productDetails: rows
      .filter((row) => row.asin)
      .map((row) => ({
        asin: row.asin,
        name: row.productName
      }))
  };
}

export async function listVariantGroups(_request, response) {
  const rows = await query(
    `SELECT
      vg.id,
      vg.group_id AS groupId,
      vg.group_name AS groupName,
      vg.variant_type AS variantType,
      vg.status,
      p.asin,
      p.name AS productName
     FROM variant_groups vg
     LEFT JOIN variant_group_products vgp ON vgp.variant_group_id = vg.id
     LEFT JOIN products p ON p.id = vgp.product_id
     ORDER BY vg.created_at DESC, p.name ASC`
  );

  const groups = [];
  const byId = new Map();

  rows.forEach((row) => {
    if (!byId.has(row.id)) {
      const current = {
        groupId: row.groupId,
        groupName: row.groupName,
        variantType: row.variantType,
        status: row.status,
        products: [],
        productDetails: []
      };
      byId.set(row.id, current);
      groups.push(current);
    }

    if (row.asin) {
      const current = byId.get(row.id);
      current.products.push(row.asin);
      current.productDetails.push({
        asin: row.asin,
        name: row.productName
      });
    }
  });

  response.json({
    success: true,
    count: groups.length,
    data: groups
  });
}

export async function createVariantGroup(request, response) {
  const groupName = normalizeString(request.body?.groupName);
  const variantType = normalizeString(request.body?.variantType);
  const status = normalizeString(request.body?.status || "draft").toLowerCase();
  const products = normalizeProducts(request.body?.products);

  if (!groupName || !variantType || products.length < 2) {
    throw new ApiError(400, "groupName, variantType, and at least two product ASINs are required");
  }

  if (!["draft", "saved"].includes(status)) {
    throw new ApiError(400, "status must be either draft or saved");
  }

  const placeholders = products.map(() => "?").join(", ");
  const productRows = await query(
    `SELECT id, asin, name, variant_group_id AS variantGroupDbId
     FROM products
     WHERE asin IN (${placeholders})`,
    products
  );

  if (productRows.length !== products.length) {
    throw new ApiError(400, "One or more selected ASINs do not exist in products");
  }

  const alreadyGrouped = productRows.find((product) => Number(product.variantGroupDbId || 0) > 0);
  if (alreadyGrouped) {
    throw new ApiError(400, `Product ${alreadyGrouped.asin} is already linked to another variant group`);
  }

  const insertResult = await query(
    `INSERT INTO variant_groups (group_name, variant_type, status)
     VALUES (?, ?, ?)`,
    [groupName, variantType, status]
  );

  const groupDbId = Number(insertResult.insertId);
  await attachGroupId(groupDbId);

  for (const product of productRows) {
    await query(
      `INSERT INTO variant_group_products (variant_group_id, product_id)
       VALUES (?, ?)`,
      [groupDbId, product.id]
    );

    await query(
      `UPDATE products
       SET variant_group_id = ?
       WHERE id = ?
       LIMIT 1`,
      [groupDbId, product.id]
    );
  }

  const created = await getVariantGroupByDbId(groupDbId);

  response.status(201).json({
    success: true,
    data: created
  });
}
