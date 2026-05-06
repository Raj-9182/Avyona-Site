import crypto from "crypto";
import { pool, query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";

const VALID_EVENTS = new Set([
  "product_view",
  "search",
  "add_to_cart",
  "checkout_start",
  "purchase",
  "category_view",
  "remove_from_cart",
  "wishlist_add",
  "filter_applied"
]);

const EVENT_ALIASES = new Map([
  ["search_query", "search"]
]);
const SENSITIVE_METADATA_KEYS = new Set([
  "authorization",
  "card",
  "cookie",
  "cvv",
  "email",
  "jwt",
  "mobile",
  "otp",
  "password",
  "phone",
  "secret",
  "token"
]);

function normalizeEventType(value) {
  const eventType = String(value || "").trim().toLowerCase();
  return EVENT_ALIASES.get(eventType) || eventType;
}

function cleanString(value, maxLength = 255) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function cleanPositiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

function cleanNonNegativeInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function cleanMoney(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : null;
}

function sanitizeMetadata(value, depth = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 2) return null;

  const safe = {};
  Object.entries(value).forEach(([key, item]) => {
    const normalizedKey = String(key || "").trim().slice(0, 80);
    if (!normalizedKey) return;

    const lowerKey = normalizedKey.toLowerCase();
    if ([...SENSITIVE_METADATA_KEYS].some((blocked) => lowerKey.includes(blocked))) return;

    if (item === null || item === undefined) return;
    if (typeof item === "string") {
      safe[normalizedKey] = item.trim().slice(0, 500);
      return;
    }
    if (typeof item === "number" || typeof item === "boolean") {
      safe[normalizedKey] = item;
      return;
    }
    if (typeof item === "object" && !Array.isArray(item)) {
      const nested = sanitizeMetadata(item, depth + 1);
      if (nested) safe[normalizedKey] = nested;
    }
    if (Array.isArray(item)) {
      safe[normalizedKey] = item.slice(0, 20).map((entry) => (
        typeof entry === "string" ? entry.trim().slice(0, 200) : entry
      )).filter((entry) => ["string", "number", "boolean"].includes(typeof entry));
    }
  });

  return Object.keys(safe).length ? safe : null;
}

function normalizeMetadata(value) {
  const safe = sanitizeMetadata(value);
  return safe ? JSON.stringify(safe).slice(0, 8000) : null;
}

function normalizeEventData(payload) {
  return JSON.stringify({
    eventType: payload.eventType,
    userId: payload.userId,
    sessionId: payload.sessionId,
    productId: payload.productId,
    categoryId: payload.categoryId,
    clickedProductId: payload.clickedProductId,
    searchQuery: payload.searchQuery,
    searchResultCount: payload.searchResultCount,
    quantity: payload.quantity,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    cartValue: payload.cartValue,
    metadata: payload.metadata
  }).slice(0, 8000);
}

function buildEventFingerprint(payload) {
  if (!payload.eventUid) return null;

  const source = [
    payload.eventUid || "",
    payload.eventType || "",
    payload.sessionId || "",
    payload.userId || "",
    payload.productId || payload.productSlug || "",
    payload.categoryId || payload.categorySlug || "",
    payload.searchQuery || "",
    payload.orderNumber || "",
    Math.floor(new Date(payload.occurredAt).getTime() / 5000)
  ].join("|");

  return crypto.createHash("sha256").update(source).digest("hex");
}

async function findProductId({ productId, productAsin, productSlug }) {
  const directId = cleanPositiveInteger(productId);
  if (directId) return directId;
  if (!productAsin && !productSlug) return null;

  const rows = await query(
    "SELECT id FROM products WHERE asin = ? OR slug = ? LIMIT 1",
    [productAsin || "", productSlug || ""]
  );
  return rows[0]?.id || null;
}

async function findOrderId({ orderId, orderNumber }) {
  const directId = cleanPositiveInteger(orderId);
  if (directId) return directId;
  if (!orderNumber) return null;

  const rows = await query("SELECT id FROM orders WHERE order_number = ? LIMIT 1", [orderNumber]);
  return rows[0]?.id || null;
}

async function findCategoryId({ categoryId, categorySlug }) {
  const directId = cleanPositiveInteger(categoryId);
  if (directId) return directId;
  if (!categorySlug) return null;

  const rows = await query("SELECT id FROM categories WHERE slug = ? LIMIT 1", [categorySlug]);
  return rows[0]?.id || null;
}

async function getProductSnapshot(productId) {
  if (!productId) return null;

  const rows = await query(
    "SELECT id, category_id AS categoryId, name, slug, asin FROM products WHERE id = ? LIMIT 1",
    [productId]
  );
  return rows[0] || null;
}

async function getCategorySnapshot(categoryId) {
  if (!categoryId) return null;

  const rows = await query(
    "SELECT id, name, slug FROM categories WHERE id = ? LIMIT 1",
    [categoryId]
  );
  return rows[0] || null;
}

function getProductKey(payload) {
  if (payload.productId) return `id:${payload.productId}`;
  if (payload.productSlug) return `slug:${payload.productSlug}`;
  if (payload.productAsin) return `asin:${payload.productAsin}`;
  return null;
}

function getEventLabel(payload, productSnapshot) {
  return productSnapshot?.name
    || payload.productSlug
    || payload.productAsin
    || payload.orderNumber
    || payload.searchQuery
    || "Storefront activity";
}

export async function buildAnalyticsEventPayload(request) {
  const eventType = normalizeEventType(request.body?.eventType || request.body?.event_type);
  if (!VALID_EVENTS.has(eventType)) {
    throw new ApiError(400, "Analytics event type is invalid");
  }

  const productAsin = cleanString(request.body?.productAsin || request.body?.asin, 80);
  const productSlug = cleanString(request.body?.productSlug || request.body?.slug, 180);
  const metadata = sanitizeMetadata(request.body?.metadata);
  const categorySlug = cleanString(request.body?.categorySlug || request.body?.category_slug || metadata?.categorySlug, 180);
  const orderNumber = cleanString(request.body?.orderNumber, 80);
  const productId = await findProductId({
    productId: request.body?.productId,
    productAsin,
    productSlug
  });
  const orderId = await findOrderId({
    orderId: request.body?.orderId,
    orderNumber
  });
  const clickedProductId = await findProductId({
    productId: request.body?.clickedProductId || request.body?.clicked_product_id,
    productAsin: cleanString(request.body?.clickedProductAsin || request.body?.clicked_product_asin, 80),
    productSlug: cleanString(request.body?.clickedProductSlug || request.body?.clicked_product_slug, 180)
  });
  const productSnapshot = await getProductSnapshot(productId);
  const categoryId = await findCategoryId({
    categoryId: request.body?.categoryId || request.body?.category_id || metadata?.categoryId || productSnapshot?.categoryId,
    categorySlug
  });

  return {
    eventType,
    eventUid: cleanString(request.body?.eventId || request.body?.eventUid || request.body?.event_id, 120),
    eventName: eventType,
    sessionId: cleanString(request.body?.sessionId || request.body?.session_id, 80),
    userId: request.customer?.id || null,
    customerId: request.customer?.id || null,
    productId,
    categoryId,
    clickedProductId,
    productAsin,
    productSlug,
    categorySlug,
    searchQuery: cleanString(request.body?.query || request.body?.searchQuery, 255),
    searchResultCount: cleanNonNegativeInteger(request.body?.resultCount ?? request.body?.result_count ?? metadata?.resultCount),
    quantity: cleanPositiveInteger(request.body?.quantity),
    orderId,
    orderNumber,
    cartValue: cleanMoney(request.body?.cartValue),
    metadata,
    metadataJson: normalizeMetadata(metadata),
    occurredAt: new Date().toISOString()
  };
}

async function writeAnalyticsEvent(payload, queueId = null) {
  const eventFingerprint = buildEventFingerprint(payload);
  const result = await query(
    `INSERT INTO analytics_events
      (source_queue_id, event_uid, event_fingerprint, event_name, event_type, user_id, session_id, customer_id, product_id, category_id, clicked_product_id, product_asin, product_slug, search_query, search_result_count, quantity, order_id, order_number, cart_value, event_data, metadata_json, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [
      queueId,
      payload.eventUid,
      eventFingerprint,
      payload.eventName || payload.eventType,
      payload.eventType,
      payload.userId,
      payload.sessionId,
      payload.customerId,
      payload.productId,
      payload.categoryId,
      payload.clickedProductId,
      payload.productAsin,
      payload.productSlug,
      payload.searchQuery,
      payload.searchResultCount,
      payload.quantity,
      payload.orderId,
      payload.orderNumber,
      payload.cartValue,
      normalizeEventData(payload),
      payload.metadataJson,
      new Date(payload.occurredAt)
    ]
  );

  return {
    id: result.insertId,
    created: result.affectedRows === 1
  };
}

async function incrementFunnelDaily(payload) {
  const isNewSession = payload.sessionId
    ? await query(
      "INSERT IGNORE INTO analytics_daily_sessions (`date`, session_id) VALUES (DATE(?), ?)",
      [new Date(payload.occurredAt), payload.sessionId]
    )
    : { affectedRows: 0 };
  const sessions = Number(isNewSession.affectedRows || 0);
  const productViews = payload.eventType === "product_view" ? 1 : 0;
  const searches = payload.eventType === "search" ? 1 : 0;
  const addToCart = payload.eventType === "add_to_cart" ? 1 : 0;
  const checkout = payload.eventType === "checkout_start" ? 1 : 0;
  const purchase = payload.eventType === "purchase" ? 1 : 0;
  const categoryViews = payload.eventType === "category_view" ? 1 : 0;
  const removeFromCart = payload.eventType === "remove_from_cart" ? 1 : 0;
  const wishlistAdd = payload.eventType === "wishlist_add" ? 1 : 0;
  const filterApplied = payload.eventType === "filter_applied" ? 1 : 0;

  await query(
    `INSERT INTO daily_funnel_metrics
      (\`date\`, sessions, product_views, searches, add_to_cart, checkout, purchase, abandoned_carts, category_views, remove_from_cart, wishlist_add, filter_applied)
     VALUES (DATE(?), ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      sessions = sessions + VALUES(sessions),
      product_views = product_views + VALUES(product_views),
      searches = searches + VALUES(searches),
      add_to_cart = add_to_cart + VALUES(add_to_cart),
      checkout = checkout + VALUES(checkout),
      purchase = purchase + VALUES(purchase),
      abandoned_carts = abandoned_carts + VALUES(abandoned_carts),
      category_views = category_views + VALUES(category_views),
      remove_from_cart = remove_from_cart + VALUES(remove_from_cart),
      wishlist_add = wishlist_add + VALUES(wishlist_add),
      filter_applied = filter_applied + VALUES(filter_applied)`,
    [
      new Date(payload.occurredAt),
      sessions,
      productViews,
      searches,
      addToCart,
      checkout,
      purchase,
      categoryViews,
      removeFromCart,
      wishlistAdd,
      filterApplied
    ]
  );

  await query(
    `INSERT INTO analytics_funnel_daily (metric_date, event_type, total)
     VALUES (DATE(?), ?, 1)
     ON DUPLICATE KEY UPDATE total = total + 1`,
    [new Date(payload.occurredAt), payload.eventType]
  );
}

async function incrementProductDaily(payload, productSnapshot) {
  const productKey = getProductKey(payload);
  if (!productKey) return;

  const views = payload.eventType === "product_view" ? 1 : 0;
  const addToCart = payload.eventType === "add_to_cart" ? 1 : 0;
  const purchases = payload.eventType === "purchase" ? 1 : 0;
  const revenue = payload.eventType === "purchase" ? Number(payload.cartValue || 0) : 0;

  if (!views && !addToCart && !purchases && !revenue) return;

  await query(
    `INSERT INTO daily_product_metrics
      (product_key, product_id, product_name, product_slug, product_asin, \`date\`, views, add_to_cart, purchases)
     VALUES (?, ?, ?, ?, ?, DATE(?), ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      product_id = COALESCE(VALUES(product_id), product_id),
      product_name = COALESCE(VALUES(product_name), product_name),
      product_slug = COALESCE(VALUES(product_slug), product_slug),
      product_asin = COALESCE(VALUES(product_asin), product_asin),
      views = views + VALUES(views),
      add_to_cart = add_to_cart + VALUES(add_to_cart),
      purchases = purchases + VALUES(purchases)`,
    [
      productKey,
      payload.productId,
      productSnapshot?.name || null,
      productSnapshot?.slug || payload.productSlug,
      productSnapshot?.asin || payload.productAsin,
      new Date(payload.occurredAt),
      views,
      addToCart,
      purchases
    ]
  );

  await query(
    `INSERT INTO analytics_product_daily
      (metric_date, product_key, product_id, product_name, product_slug, product_asin, views, add_to_cart, purchases, revenue)
     VALUES (DATE(?), ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      product_id = COALESCE(VALUES(product_id), product_id),
      product_name = COALESCE(VALUES(product_name), product_name),
      product_slug = COALESCE(VALUES(product_slug), product_slug),
      product_asin = COALESCE(VALUES(product_asin), product_asin),
      views = views + VALUES(views),
      add_to_cart = add_to_cart + VALUES(add_to_cart),
      purchases = purchases + VALUES(purchases),
      revenue = revenue + VALUES(revenue)`,
    [
      new Date(payload.occurredAt),
      productKey,
      payload.productId,
      productSnapshot?.name || null,
      productSnapshot?.slug || payload.productSlug,
      productSnapshot?.asin || payload.productAsin,
      views,
      addToCart,
      purchases,
      revenue
    ]
  );
}

async function incrementSearchDaily(payload) {
  if (payload.eventType !== "search" || !payload.searchQuery) return;

  await query(
    `INSERT INTO daily_search_metrics
      (search_query, \`date\`, \`count\`, total_result_count, zero_result_count, clicked_product_count, last_clicked_product_id)
     VALUES (?, DATE(?), 1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      \`count\` = \`count\` + 1,
      total_result_count = total_result_count + VALUES(total_result_count),
      zero_result_count = zero_result_count + VALUES(zero_result_count),
      clicked_product_count = clicked_product_count + VALUES(clicked_product_count),
      last_clicked_product_id = COALESCE(VALUES(last_clicked_product_id), last_clicked_product_id)`,
    [
      payload.searchQuery,
      new Date(payload.occurredAt),
      Number(payload.searchResultCount || 0),
      payload.searchResultCount === 0 ? 1 : 0,
      payload.clickedProductId ? 1 : 0,
      payload.clickedProductId
    ]
  );

  await query(
    `INSERT INTO analytics_search_daily (metric_date, search_query, total)
     VALUES (DATE(?), ?, 1)
     ON DUPLICATE KEY UPDATE total = total + 1`,
    [new Date(payload.occurredAt), payload.searchQuery]
  );
}

async function incrementCategoryDaily(payload, categorySnapshot) {
  const categoryKey = payload.categoryId
    ? `id:${payload.categoryId}`
    : payload.categorySlug
      ? `slug:${payload.categorySlug}`
      : null;
  if (!categoryKey) return;

  const views = payload.eventType === "category_view" ? 1 : 0;
  const conversions = payload.eventType === "purchase" ? 1 : 0;
  if (!views && !conversions) return;

  await query(
    `INSERT INTO daily_category_metrics
      (category_key, category_id, category_name, category_slug, \`date\`, views, conversions)
     VALUES (?, ?, ?, ?, DATE(?), ?, ?)
     ON DUPLICATE KEY UPDATE
      category_id = COALESCE(VALUES(category_id), category_id),
      category_name = COALESCE(VALUES(category_name), category_name),
      category_slug = COALESCE(VALUES(category_slug), category_slug),
      views = views + VALUES(views),
      conversions = conversions + VALUES(conversions)`,
    [
      categoryKey,
      payload.categoryId,
      categorySnapshot?.name || payload.metadata?.categoryName || null,
      categorySnapshot?.slug || payload.categorySlug,
      new Date(payload.occurredAt),
      views,
      conversions
    ]
  );
}

async function writeRecentEvent(payload, analyticsEventId, productSnapshot) {
  await query(
    `INSERT INTO analytics_recent_events
      (source_event_id, event_type, search_query, label, quantity, cart_value, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      analyticsEventId,
      payload.eventType,
      payload.searchQuery,
      getEventLabel(payload, productSnapshot),
      payload.quantity,
      payload.cartValue,
      new Date(payload.occurredAt)
    ]
  );

  await query(
    `DELETE FROM analytics_recent_events
     WHERE id NOT IN (
       SELECT id FROM (
         SELECT id FROM analytics_recent_events ORDER BY occurred_at DESC, id DESC LIMIT 200
       ) recent
     )`
  );
}

export async function writeRawAnalyticsEvent(payload) {
  return writeAnalyticsEvent(payload);
}

export async function aggregateAnalyticsEvent(payload, analyticsEventId) {
  const productSnapshot = await getProductSnapshot(payload.productId);
  const categorySnapshot = await getCategorySnapshot(payload.categoryId || productSnapshot?.categoryId);

  await incrementFunnelDaily(payload);
  await incrementProductDaily(payload, productSnapshot);
  await incrementSearchDaily(payload);
  await incrementCategoryDaily(payload, categorySnapshot);
  await writeRecentEvent(payload, analyticsEventId, productSnapshot);
}

async function getProcessorCheckpoint(connection, processorName) {
  await connection.query(
    `INSERT IGNORE INTO analytics_processing_state (processor_name, last_event_id, last_run_at)
     VALUES (?, 0, NULL)`,
    [processorName]
  );

  const [rows] = await connection.query(
    `SELECT last_event_id AS lastEventId
     FROM analytics_processing_state
     WHERE processor_name = ?
     FOR UPDATE`,
    [processorName]
  );

  return Number(rows[0]?.lastEventId || 0);
}

async function getBatchEndEventId(connection, startEventId, limit) {
  const [rows] = await connection.query(
    `SELECT id
     FROM analytics_events
     WHERE id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [startEventId, limit]
  );

  if (!rows.length) return null;
  return Number(rows[rows.length - 1].id);
}

async function runSql(connection, sql, values = []) {
  const [rows] = await connection.query(sql, values);
  return rows;
}

async function updateSessionMetrics(connection, startEventId, endEventId) {
  await runSql(
    connection,
    `INSERT IGNORE INTO analytics_daily_sessions (\`date\`, session_id)
     SELECT DATE(occurred_at), session_id
     FROM analytics_events
     WHERE id > ?
       AND id <= ?
       AND session_id IS NOT NULL
       AND session_id <> ''
     GROUP BY DATE(occurred_at), session_id`,
    [startEventId, endEventId]
  );

  await runSql(
    connection,
    `INSERT IGNORE INTO analytics_daily_users (\`date\`, user_id)
     SELECT DATE(occurred_at), user_id
     FROM analytics_events
     WHERE id > ?
       AND id <= ?
       AND user_id IS NOT NULL
     GROUP BY DATE(occurred_at), user_id`,
    [startEventId, endEventId]
  );

  const sessionRows = await runSql(
    connection,
    `SELECT ads.\`date\`, COUNT(*) AS sessions
     FROM analytics_daily_sessions ads
     WHERE ads.\`date\` IN (
       SELECT DISTINCT DATE(occurred_at)
       FROM analytics_events
       WHERE id > ? AND id <= ?
     )
     GROUP BY ads.\`date\``,
    [startEventId, endEventId]
  );

  for (const row of sessionRows) {
    await runSql(
      connection,
      `INSERT INTO daily_funnel_metrics (\`date\`, sessions)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE sessions = VALUES(sessions)`,
      [row.date, Number(row.sessions || 0)]
    );
  }

  const userRows = await runSql(
    connection,
    `SELECT adu.\`date\`, COUNT(*) AS users
     FROM analytics_daily_users adu
     WHERE adu.\`date\` IN (
       SELECT DISTINCT DATE(occurred_at)
       FROM analytics_events
       WHERE id > ? AND id <= ?
     )
     GROUP BY adu.\`date\``,
    [startEventId, endEventId]
  );

  for (const row of userRows) {
    await runSql(
      connection,
      `INSERT INTO daily_funnel_metrics (\`date\`, users)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE users = VALUES(users)`,
      [row.date, Number(row.users || 0)]
    );
  }
}

async function updateFunnelMetrics(connection, startEventId, endEventId) {
  await runSql(
    connection,
    `INSERT INTO daily_funnel_metrics
      (\`date\`, product_views, searches, add_to_cart, checkout, purchase, abandoned_carts, category_views, remove_from_cart, wishlist_add, filter_applied)
     SELECT
      DATE(occurred_at),
      SUM(event_type = 'product_view'),
      SUM(event_type = 'search'),
      SUM(event_type = 'add_to_cart'),
      SUM(event_type = 'checkout_start'),
      SUM(event_type = 'purchase'),
      0,
      SUM(event_type = 'category_view'),
      SUM(event_type = 'remove_from_cart'),
      SUM(event_type = 'wishlist_add'),
      SUM(event_type = 'filter_applied')
     FROM analytics_events
     WHERE id > ? AND id <= ?
     GROUP BY DATE(occurred_at)
     ON DUPLICATE KEY UPDATE
      product_views = product_views + VALUES(product_views),
      searches = searches + VALUES(searches),
      add_to_cart = add_to_cart + VALUES(add_to_cart),
      checkout = checkout + VALUES(checkout),
      purchase = purchase + VALUES(purchase),
      abandoned_carts = abandoned_carts + VALUES(abandoned_carts),
      category_views = category_views + VALUES(category_views),
      remove_from_cart = remove_from_cart + VALUES(remove_from_cart),
      wishlist_add = wishlist_add + VALUES(wishlist_add),
      filter_applied = filter_applied + VALUES(filter_applied)`,
    [startEventId, endEventId]
  );
}

async function updateProductMetrics(connection, startEventId, endEventId) {
  await runSql(
    connection,
    `INSERT INTO daily_product_metrics
      (product_key, product_id, product_name, product_slug, product_asin, \`date\`, views, add_to_cart, purchases)
     SELECT
      COALESCE(CONCAT('id:', ae.product_id), CONCAT('slug:', ae.product_slug), CONCAT('asin:', ae.product_asin)) AS product_key,
      ae.product_id,
      MAX(p.name),
      COALESCE(MAX(p.slug), MAX(ae.product_slug)),
      COALESCE(MAX(p.asin), MAX(ae.product_asin)),
      DATE(ae.occurred_at),
      SUM(ae.event_type = 'product_view'),
      SUM(ae.event_type = 'add_to_cart'),
      SUM(ae.event_type = 'purchase')
     FROM analytics_events ae
     LEFT JOIN products p ON p.id = ae.product_id
     WHERE ae.id > ?
       AND ae.id <= ?
       AND ae.event_type IN ('product_view', 'add_to_cart', 'purchase')
       AND COALESCE(ae.product_id, ae.product_slug, ae.product_asin) IS NOT NULL
     GROUP BY product_key, ae.product_id, DATE(ae.occurred_at)
     ON DUPLICATE KEY UPDATE
      product_id = COALESCE(VALUES(product_id), product_id),
      product_name = COALESCE(VALUES(product_name), product_name),
      product_slug = COALESCE(VALUES(product_slug), product_slug),
      product_asin = COALESCE(VALUES(product_asin), product_asin),
      views = views + VALUES(views),
      add_to_cart = add_to_cart + VALUES(add_to_cart),
      purchases = purchases + VALUES(purchases)`,
    [startEventId, endEventId]
  );
}

async function updateSearchMetrics(connection, startEventId, endEventId) {
  await runSql(
    connection,
    `INSERT INTO daily_search_metrics
      (search_query, \`date\`, \`count\`, total_result_count, zero_result_count, clicked_product_count, last_clicked_product_id)
     SELECT
      search_query,
      DATE(occurred_at),
      SUM(event_type = 'search'),
      SUM(COALESCE(search_result_count, 0)),
      SUM(event_type = 'search' AND search_result_count = 0),
      SUM(clicked_product_id IS NOT NULL),
      MAX(clicked_product_id)
     FROM analytics_events
     WHERE id > ?
       AND id <= ?
       AND search_query IS NOT NULL
       AND search_query <> ''
     GROUP BY search_query, DATE(occurred_at)
     ON DUPLICATE KEY UPDATE
      \`count\` = \`count\` + VALUES(\`count\`),
      total_result_count = total_result_count + VALUES(total_result_count),
      zero_result_count = zero_result_count + VALUES(zero_result_count),
      clicked_product_count = clicked_product_count + VALUES(clicked_product_count),
      last_clicked_product_id = COALESCE(VALUES(last_clicked_product_id), last_clicked_product_id)`,
    [startEventId, endEventId]
  );
}

async function updateCategoryMetrics(connection, startEventId, endEventId) {
  await runSql(
    connection,
    `INSERT INTO daily_category_metrics
      (category_key, category_id, category_name, category_slug, \`date\`, views, conversions)
     SELECT
      COALESCE(CONCAT('id:', ae.category_id), JSON_UNQUOTE(JSON_EXTRACT(ae.event_data, '$.metadata.categorySlug'))) AS category_key,
      ae.category_id,
      MAX(c.name),
      COALESCE(MAX(c.slug), MAX(JSON_UNQUOTE(JSON_EXTRACT(ae.event_data, '$.metadata.categorySlug')))),
      DATE(ae.occurred_at),
      SUM(ae.event_type = 'category_view'),
      SUM(ae.event_type = 'purchase')
     FROM analytics_events ae
     LEFT JOIN categories c ON c.id = ae.category_id
     WHERE ae.id > ?
       AND ae.id <= ?
       AND ae.event_type IN ('category_view', 'purchase')
       AND COALESCE(ae.category_id, JSON_UNQUOTE(JSON_EXTRACT(ae.event_data, '$.metadata.categorySlug'))) IS NOT NULL
     GROUP BY
      COALESCE(CONCAT('id:', ae.category_id), JSON_UNQUOTE(JSON_EXTRACT(ae.event_data, '$.metadata.categorySlug'))),
      ae.category_id,
      DATE(ae.occurred_at)
     ON DUPLICATE KEY UPDATE
      category_id = COALESCE(VALUES(category_id), category_id),
      category_name = COALESCE(VALUES(category_name), category_name),
      category_slug = COALESCE(VALUES(category_slug), category_slug),
      views = views + VALUES(views),
      conversions = conversions + VALUES(conversions)`,
    [startEventId, endEventId]
  );
}

export async function detectAbandonedCarts({ windowMinutes = 45 } = {}) {
  const minutes = Math.max(30, Math.min(60, Number(windowMinutes || 45)));

  await query(
    `INSERT IGNORE INTO analytics_abandoned_carts
      (session_id, customer_id, last_cart_event_id, cart_value, last_cart_at, abandoned_at)
     SELECT
      cart_sessions.session_id,
      cart_sessions.customer_id,
      cart_sessions.last_cart_event_id,
      cart_sessions.cart_value,
      cart_sessions.last_cart_at,
      NOW()
     FROM (
       SELECT
        latest.session_id,
        MAX(ae.customer_id) AS customer_id,
        latest.last_cart_event_id,
        MAX(latest.last_cart_at) AS last_cart_at,
        SUM(COALESCE(ae.cart_value, 0)) AS cart_value
       FROM (
         SELECT
          session_id,
          MAX(id) AS last_cart_event_id,
          MAX(occurred_at) AS last_cart_at
         FROM analytics_events
         WHERE event_type = 'add_to_cart'
           AND session_id IS NOT NULL
           AND session_id <> ''
           AND occurred_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
         GROUP BY session_id
       ) latest
       JOIN analytics_events ae ON ae.session_id = latest.session_id
        AND ae.event_type = 'add_to_cart'
        AND ae.occurred_at <= latest.last_cart_at
       GROUP BY latest.session_id, latest.last_cart_event_id
     ) cart_sessions
     WHERE NOT EXISTS (
       SELECT 1
       FROM analytics_events purchase_events
       WHERE purchase_events.session_id = cart_sessions.session_id
         AND purchase_events.event_type = 'purchase'
         AND purchase_events.occurred_at >= cart_sessions.last_cart_at
       LIMIT 1
     )`,
    [minutes]
  );

  const metricRows = await query(
    `SELECT DATE(abandoned_at) AS metricDate, COUNT(*) AS abandonedCarts
     FROM analytics_abandoned_carts
     WHERE metric_recorded = 0
     GROUP BY DATE(abandoned_at)`
  );

  for (const row of metricRows) {
    await query(
      `INSERT INTO daily_funnel_metrics (\`date\`, abandoned_carts)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE abandoned_carts = abandoned_carts + VALUES(abandoned_carts)`,
      [row.metricDate, Number(row.abandonedCarts || 0)]
    );
  }

  const result = await query(
    "UPDATE analytics_abandoned_carts SET metric_recorded = 1 WHERE metric_recorded = 0"
  );

  return {
    marked: Number(result.affectedRows || 0),
    windowMinutes: minutes
  };
}

export async function aggregateRawAnalyticsEvents({ limit = 5000, processorName = "daily_metrics" } = {}) {
  const connection = await pool.getConnection();
  let hasLock = false;

  try {
    const [lockRows] = await connection.query("SELECT GET_LOCK(?, 0) AS gotLock", [`analytics:${processorName}`]);
    hasLock = Number(lockRows[0]?.gotLock || 0) === 1;
    if (!hasLock) {
      return { processed: 0, skipped: true, reason: "processor already running" };
    }

    await connection.beginTransaction();

    const startEventId = await getProcessorCheckpoint(connection, processorName);
    const endEventId = await getBatchEndEventId(connection, startEventId, limit);

    if (!endEventId) {
      await connection.query(
        "UPDATE analytics_processing_state SET last_run_at = NOW() WHERE processor_name = ?",
        [processorName]
      );
      await connection.commit();
      return { processed: 0, fromEventId: startEventId, toEventId: startEventId };
    }

    await updateSessionMetrics(connection, startEventId, endEventId);
    await updateFunnelMetrics(connection, startEventId, endEventId);
    await updateProductMetrics(connection, startEventId, endEventId);
    await updateSearchMetrics(connection, startEventId, endEventId);
    await updateCategoryMetrics(connection, startEventId, endEventId);

    await connection.query(
      `UPDATE analytics_processing_state
       SET last_event_id = ?, last_run_at = NOW()
       WHERE processor_name = ?`,
      [endEventId, processorName]
    );

    await connection.commit();

    return {
      processed: endEventId - startEventId,
      fromEventId: startEventId + 1,
      toEventId: endEventId
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Transaction may already be closed after checkpoint reservation.
    }
    throw error;
  } finally {
    if (hasLock) {
      await connection.query("SELECT RELEASE_LOCK(?)", [`analytics:${processorName}`]).catch(() => {});
    }
    connection.release();
  }
}
