import fs from "fs/promises";
import path from "path";
import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const localProductsPath = path.resolve(process.cwd(), "data", "local-products.json");
const localVariantGroupsPath = path.resolve(process.cwd(), "data", "local-variant-groups.json");

function isDatabaseUnavailable(error) {
  if (process.env.REQUIRE_MYSQL === "true") return false;
  return ["ECONNREFUSED", "ER_NO_SUCH_TABLE", "ER_BAD_DB_ERROR", "PROTOCOL_CONNECTION_LOST"].includes(error?.code);
}

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

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function buildLocalGroupId(groups) {
  const maxNumber = groups.reduce((max, group) => {
    const match = String(group.groupId || "").match(/^GRP(\d+)$/i);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `GRP${String(maxNumber + 1).padStart(4, "0")}`;
}

function groupWithProductDetails(group, products) {
  const productDetails = (group.products || [])
    .map((asin) => products.find((product) => String(product.asin || "") === String(asin)))
    .filter(Boolean)
    .map((product) => ({
      asin: product.asin,
      name: product.name
    }));

  return {
    ...group,
    productDetails
  };
}

function uniqueNumbers(values) {
  return [...new Set(values.map((value) => Number(value || 0)).filter((value) => value > 0))];
}

function buildPlaceholders(values) {
  return values.map(() => "?").join(", ");
}

async function deleteGroupsWithTooFewProducts(groupDbIds) {
  const ids = uniqueNumbers(groupDbIds);
  if (!ids.length) return;

  const placeholders = buildPlaceholders(ids);
  const sparseGroups = await query(
    `SELECT vg.id, COUNT(vgp.product_id) AS productCount
     FROM variant_groups vg
     LEFT JOIN variant_group_products vgp ON vgp.variant_group_id = vg.id
     WHERE vg.id IN (${placeholders})
     GROUP BY vg.id
     HAVING productCount < 2`,
    ids
  );
  const sparseGroupIds = uniqueNumbers(sparseGroups.map((group) => group.id));
  if (!sparseGroupIds.length) return;

  const sparsePlaceholders = buildPlaceholders(sparseGroupIds);
  await query(`UPDATE products SET variant_group_id = NULL WHERE variant_group_id IN (${sparsePlaceholders})`, sparseGroupIds);
  await query(`DELETE FROM variant_groups WHERE id IN (${sparsePlaceholders})`, sparseGroupIds);
}

async function detachProductsFromOtherGroups(productRows, targetGroupDbId = 0) {
  const productIds = uniqueNumbers(productRows.map((product) => product.id));
  const previousGroupIds = uniqueNumbers(
    productRows
      .map((product) => product.variantGroupDbId)
      .filter((groupDbId) => Number(groupDbId) !== Number(targetGroupDbId))
  );

  if (!productIds.length || !previousGroupIds.length) return;

  const productPlaceholders = buildPlaceholders(productIds);
  const groupPlaceholders = buildPlaceholders(previousGroupIds);

  await query(
    `DELETE FROM variant_group_products
     WHERE product_id IN (${productPlaceholders})
       AND variant_group_id IN (${groupPlaceholders})`,
    [...productIds, ...previousGroupIds]
  );
  await query(
    `UPDATE products
     SET variant_group_id = NULL
     WHERE id IN (${productPlaceholders})
       AND variant_group_id IN (${groupPlaceholders})`,
    [...productIds, ...previousGroupIds]
  );
  await deleteGroupsWithTooFewProducts(previousGroupIds);
}

async function saveLocalGroup(groupPayload, existingGroupId = "") {
  const groups = await readJsonFile(localVariantGroupsPath, []);
  const products = await readJsonFile(localProductsPath, []);
  const selectedAsins = normalizeProducts(groupPayload.products);
  const groupId = existingGroupId || buildLocalGroupId(groups);
  const groupName = normalizeString(groupPayload.groupName);
  const variantType = normalizeString(groupPayload.variantType);
  const status = normalizeString(groupPayload.status || "saved").toLowerCase();

  if (!groupName || !variantType || selectedAsins.length < 2) {
    throw new ApiError(400, "groupName, variantType, and at least two product ASINs are required");
  }

  if (!["draft", "saved"].includes(status)) {
    throw new ApiError(400, "status must be either draft or saved");
  }

  const missingAsin = selectedAsins.find((asin) => !products.some((product) => String(product.asin || "") === String(asin)));
  if (missingAsin) {
    throw new ApiError(400, `Product ${missingAsin} does not exist`);
  }

  const now = new Date().toISOString();
  const nextGroup = {
    groupId,
    groupName,
    variantType,
    status,
    products: selectedAsins,
    createdAt: groups.find((group) => group.groupId === groupId)?.createdAt || now,
    updatedAt: now
  };

  const selectedSet = new Set(selectedAsins);
  const remainingGroups = groups
    .filter((group) => group.groupId !== groupId)
    .map((group) => ({
      ...group,
      products: (group.products || []).filter((asin) => !selectedSet.has(String(asin)))
    }))
    .filter((group) => (group.products || []).length >= 2);
  const nextGroups = [nextGroup, ...remainingGroups];
  const nextProducts = products.map((product) => {
    const belongsToThisGroup = String(product.variantGroupId || "") === groupId;
    if (!selectedSet.has(String(product.asin || "")) && !belongsToThisGroup) return product;

    if (!selectedSet.has(String(product.asin || ""))) {
      return {
        ...product,
        variantGroupDbId: null,
        variantGroupId: null,
        variantGroupName: null,
        variantType: null,
        variantValue: null,
        updatedAt: now
      };
    }

    return {
      ...product,
      variantGroupDbId: null,
      variantGroupId: groupId,
      variantGroupName: groupName,
      variantType,
      variantValue: product.name || product.asin,
      updatedAt: now
    };
  });

  await writeJsonFile(localVariantGroupsPath, nextGroups);
  await writeJsonFile(localProductsPath, nextProducts);

  return groupWithProductDetails(nextGroup, nextProducts);
}

async function deleteLocalGroup(groupId) {
  const groups = await readJsonFile(localVariantGroupsPath, []);
  const target = groups.find((group) => group.groupId === groupId);

  if (!target) {
    throw new ApiError(404, "Variant group not found");
  }

  const now = new Date().toISOString();
  const products = await readJsonFile(localProductsPath, []);
  const nextProducts = products.map((product) => {
    if (String(product.variantGroupId || "") !== groupId) return product;
    return {
      ...product,
      variantGroupDbId: null,
      variantGroupId: null,
      variantGroupName: null,
      variantType: null,
      variantValue: null,
      updatedAt: now
    };
  });

  await writeJsonFile(localVariantGroupsPath, groups.filter((group) => group.groupId !== groupId));
  await writeJsonFile(localProductsPath, nextProducts);
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
  let rows;
  try {
    rows = await query(
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
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const products = await readJsonFile(localProductsPath, []);
    const groups = await readJsonFile(localVariantGroupsPath, []);
    response.json({
      success: true,
      count: groups.length,
      data: groups.map((group) => groupWithProductDetails(group, products)),
      source: "local-file"
    });
    return;
  }

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

  let productRows;
  try {
    const placeholders = products.map(() => "?").join(", ");
    productRows = await query(
      `SELECT id, asin, name, variant_group_id AS variantGroupDbId
       FROM products
       WHERE asin IN (${placeholders})`,
      products
    );
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const created = await saveLocalGroup({ groupName, variantType, status, products });
    response.status(201).json({
      success: true,
      data: created,
      source: "local-file"
    });
    return;
  }

  if (productRows.length !== products.length) {
    throw new ApiError(400, "One or more selected ASINs do not exist in products");
  }

  const insertResult = await query(
    `INSERT INTO variant_groups (group_name, variant_type, status)
     VALUES (?, ?, ?)`,
    [groupName, variantType, status]
  );

  const groupDbId = Number(insertResult.insertId);
  await attachGroupId(groupDbId);
  await detachProductsFromOtherGroups(productRows, groupDbId);

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

export async function updateVariantGroup(request, response) {
  const groupId = normalizeString(request.params.groupId);
  const groupName = normalizeString(request.body?.groupName);
  const variantType = normalizeString(request.body?.variantType);
  const status = normalizeString(request.body?.status || "saved").toLowerCase();
  const products = normalizeProducts(request.body?.products);

  if (!groupId) {
    throw new ApiError(400, "Variant group id is required");
  }

  if (!groupName || !variantType || products.length < 2) {
    throw new ApiError(400, "groupName, variantType, and at least two product ASINs are required");
  }

  if (!["draft", "saved"].includes(status)) {
    throw new ApiError(400, "status must be either draft or saved");
  }

  let groupRows;
  try {
    groupRows = await query("SELECT id FROM variant_groups WHERE group_id = ? LIMIT 1", [groupId]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    const updated = await saveLocalGroup({ groupName, variantType, status, products }, groupId);
    response.json({
      success: true,
      data: updated,
      source: "local-file"
    });
    return;
  }

  if (!groupRows.length) {
    throw new ApiError(404, "Variant group not found");
  }

  const groupDbId = Number(groupRows[0].id);
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

  await detachProductsFromOtherGroups(productRows, groupDbId);
  await query(
    `UPDATE variant_groups
     SET group_name = ?, variant_type = ?, status = ?
     WHERE id = ?
     LIMIT 1`,
    [groupName, variantType, status, groupDbId]
  );
  await query("DELETE FROM variant_group_products WHERE variant_group_id = ?", [groupDbId]);
  await query("UPDATE products SET variant_group_id = NULL WHERE variant_group_id = ?", [groupDbId]);

  for (const product of productRows) {
    await query(
      `INSERT INTO variant_group_products (variant_group_id, product_id)
       VALUES (?, ?)`,
      [groupDbId, product.id]
    );
    await query("UPDATE products SET variant_group_id = ? WHERE id = ? LIMIT 1", [groupDbId, product.id]);
  }

  const updated = await getVariantGroupByDbId(groupDbId);
  response.json({
    success: true,
    data: updated
  });
}

export async function deleteVariantGroup(request, response) {
  const groupId = normalizeString(request.params.groupId);

  if (!groupId) {
    throw new ApiError(400, "Variant group id is required");
  }

  let groupRows;
  try {
    groupRows = await query("SELECT id FROM variant_groups WHERE group_id = ? LIMIT 1", [groupId]);
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    await deleteLocalGroup(groupId);
    response.json({
      success: true,
      message: "Variant group deleted successfully",
      source: "local-file"
    });
    return;
  }

  if (!groupRows.length) {
    throw new ApiError(404, "Variant group not found");
  }

  await query("UPDATE products SET variant_group_id = NULL WHERE variant_group_id = ?", [Number(groupRows[0].id)]);
  await query("DELETE FROM variant_groups WHERE id = ? LIMIT 1", [Number(groupRows[0].id)]);

  response.json({
    success: true,
    message: "Variant group deleted successfully"
  });
}
