import { query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ORDER_STATUS_FLOW } from "../../shared/orderStatusFlow.js";

function buildTimelineTitle(status) {
  if (status === "pending") return "Order pending";
  if (status === "confirmed") return "Order confirmed";
  if (status === "packed") return "Order packed";
  if (status === "shipped") return "Order shipped";
  if (status === "out_for_delivery") return "Out for delivery";
  if (status === "delivered") return "Order delivered";
  if (status === "cancelled") return "Order cancelled";
  if (status === "returned") return "Order returned";
  return "Order updated";
}

export async function listOrders(_request, response) {
  const rows = await query(
    `SELECT
      o.id,
      o.customer_id AS customerId,
      c.full_name AS customerName,
      c.email AS customerEmail,
      o.order_number AS orderNumber,
      o.status,
      o.payment_method AS paymentMethod,
      o.subtotal,
      o.shipping_fee AS shippingFee,
      o.total_amount AS totalAmount,
      o.created_at AS createdAt,
      o.updated_at AS updatedAt
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC`
  );

  response.json({
    success: true,
    count: rows.length,
    data: rows
  });
}

export async function updateOrderStatus(request, response) {
  const { status, courierName, expectedDeliveryDate, note } = request.body || {};
  const allowedStatuses = ORDER_STATUS_FLOW;
  const normalizedStatus = String(status || "");

  if (!allowedStatuses.includes(normalizedStatus)) {
    throw new ApiError(400, "Invalid order status");
  }

  const orderId = Number(request.params.id);
  const currentRows = await query(
    `SELECT id, order_number AS orderNumber, status, payment_method AS paymentMethod, total_amount AS totalAmount,
            courier_name AS courierName, expected_delivery_date AS expectedDeliveryDate
     FROM orders
     WHERE id = ?
     LIMIT 1`,
    [orderId]
  );

  const currentOrder = currentRows[0];

  if (!currentOrder) {
    throw new ApiError(404, "Order not found");
  }

  await query(
    `UPDATE orders
     SET status = ?, courier_name = ?, expected_delivery_date = ?
     WHERE id = ?`,
    [
      normalizedStatus,
      courierName ? String(courierName).trim() : null,
      expectedDeliveryDate ? String(expectedDeliveryDate) : null,
      orderId
    ]
  );

  if (currentOrder.status !== normalizedStatus) {
    await query(
      `INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [
        orderId,
        normalizedStatus,
        buildTimelineTitle(normalizedStatus),
        note ? String(note).trim() : null
      ]
    );
  }

  const rows = await query(
    `SELECT id, order_number AS orderNumber, status, payment_method AS paymentMethod, total_amount AS totalAmount,
            courier_name AS courierName, expected_delivery_date AS expectedDeliveryDate
     FROM orders
     WHERE id = ?
     LIMIT 1`,
    [orderId]
  );

  response.json({
    success: true,
    data: rows[0]
  });
}
