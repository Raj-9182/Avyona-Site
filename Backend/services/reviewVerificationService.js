import { query } from "../config/db.js";

export async function hasDeliveredOrderForReview({ customerId, productId, orderId = null }) {
  const safeCustomerId = Number(customerId || 0);
  const safeProductId = Number(productId || 0);
  const safeOrderId = orderId ? Number(orderId) : null;

  if (!safeCustomerId || !safeProductId) {
    return false;
  }

  const values = [safeCustomerId, safeProductId];
  const orderFilter = safeOrderId ? "AND o.id = ?" : "";
  if (safeOrderId) values.push(safeOrderId);

  const rows = await query(
    `SELECT o.id
     FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = ?
       AND oi.product_id = ?
       AND o.status = 'delivered'
       ${orderFilter}
     LIMIT 1`,
    values
  );

  return Boolean(rows[0]);
}

export async function resolveVerifiedPurchaseStatus({ customerId, productId, orderId = null }) {
  return hasDeliveredOrderForReview({ customerId, productId, orderId });
}
