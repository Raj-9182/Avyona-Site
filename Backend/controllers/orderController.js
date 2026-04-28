import { pool, query } from "../config/db.js";
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
      c.phone AS customerPhone,
      o.order_number AS orderNumber,
      o.status,
      o.payment_status AS paymentStatus,
      o.payment_method AS paymentMethod,
      o.subtotal,
      o.shipping_fee AS shippingFee,
      o.total_amount AS totalAmount,
      (
        SELECT COUNT(*)
        FROM order_items item
        WHERE item.order_id = o.id
      ) AS itemCount,
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

function normalizePaymentStatus(paymentMethod) {
  const method = String(paymentMethod || "").toLowerCase();
  if (method === "cod") return "cod_pending";
  return "pending";
}

function createOrderNumber() {
  return `AVY-${Date.now().toString().slice(-8)}`;
}

export async function createOrder(request, response) {
  const {
    customer = {},
    address = {},
    items = [],
    pricing = {},
    paymentMethod = "cod",
    shippingMethod = "standard",
    couponCode = ""
  } = request.body || {};

  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(400, "Order must include at least one item");
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() || customer.fullName || "Guest Customer";
  const email = String(customer.email || customer.contact || "").trim() || null;
  const phone = String(customer.phone || "").trim() || null;
  const line1 = String(address.line1 || "").trim();
  const city = String(address.city || "").trim();
  const state = String(address.state || "").trim();
  const pincode = String(address.pincode || "").trim();

  if (!line1 || !city || !state || !pincode || !phone) {
    throw new ApiError(400, "Delivery address and phone are required");
  }

  const subtotal = Number(pricing.subtotal || 0);
  const discount = Number(pricing.discount || 0);
  const shippingFee = Number(pricing.shipping || 0);
  const totalAmount = Number(pricing.total || Math.max(0, subtotal - discount) + shippingFee);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let customerId = null;
    if (email) {
      const [existingCustomers] = await connection.execute(
        "SELECT id FROM customers WHERE email = ? LIMIT 1",
        [email]
      );

      if (existingCustomers[0]) {
        customerId = existingCustomers[0].id;
        await connection.execute(
          `UPDATE customers
           SET full_name = ?, phone = COALESCE(?, phone), city = ?, state = ?
           WHERE id = ?`,
          [fullName, phone, city, state, customerId]
        );
      } else {
        const [customerResult] = await connection.execute(
          `INSERT INTO customers (full_name, email, phone, city, state, total_orders, total_spent)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
          [fullName, email, phone, city, state]
        );
        customerId = customerResult.insertId;
      }
    }

    const orderNumber = createOrderNumber();
    const paymentStatus = normalizePaymentStatus(paymentMethod);
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
        (customer_id, order_number, status, payment_status, payment_method, subtotal, shipping_fee, total_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, orderNumber, "pending", paymentStatus, paymentMethod, subtotal, shippingFee, totalAmount]
    );
    const orderId = orderResult.insertId;

    await connection.execute(
      `INSERT INTO order_addresses
        (order_id, address_type, full_name, email, phone, line1, line2, landmark, city, state, pincode, country)
       VALUES (?, 'delivery', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'India')`,
      [
        orderId,
        fullName,
        email,
        phone,
        line1,
        address.line2 || null,
        address.landmark || null,
        city,
        state,
        pincode
      ]
    );

    for (const item of items) {
      const identifier = String(item.asin || item.slug || "").trim();
      let productId = null;
      if (identifier) {
        const [productRows] = await connection.execute(
          "SELECT id FROM products WHERE asin = ? OR slug = ? LIMIT 1",
          [identifier, identifier]
        );
        productId = productRows[0]?.id || null;
      }

      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.price || 0);
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, productId, item.name || "Product", quantity, unitPrice, unitPrice * quantity]
      );

      if (productId) {
        await connection.execute(
          "UPDATE products SET stock_quantity = GREATEST(stock_quantity - ?, 0) WHERE id = ?",
          [quantity, productId]
        );
      }
    }

    await connection.execute(
      `INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
       VALUES (?, 'pending', 'Order pending', ?, NOW())`,
      [orderId, couponCode ? `Coupon ${couponCode} applied. Shipping method: ${shippingMethod}` : `Shipping method: ${shippingMethod}`]
    );

    if (customerId) {
      await connection.execute(
        `UPDATE customers
         SET total_orders = total_orders + 1, total_spent = total_spent + ?
         WHERE id = ?`,
        [totalAmount, customerId]
      );
    }

    await connection.commit();

    response.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        id: orderId,
        orderNumber,
        status: "pending",
        paymentStatus,
        paymentMethod,
        subtotal,
        discount,
        shippingFee,
        totalAmount
      }
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
