import { pool, query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { ORDER_STATUS_FLOW } from "../../shared/orderStatusFlow.js";
import { grantReferralBonus, grantPurchaseCashback, grantMilestoneReward } from "../services/creditPointsRewards.js";

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
  if (["test_success", "test-payment-success", "test_payment_success"].includes(method)) return "paid";
  if (["test_failure", "test-payment-failure", "test_payment_failure"].includes(method)) return "failed";
  return "pending";
}

function shouldReduceStock(paymentStatus) {
  return ["paid", "authorized", "cod_pending"].includes(paymentStatus);
}

function normalizeShippingFee(shippingMethod, pricing = {}) {
  const method = String(shippingMethod || "standard").toLowerCase();
  if (method === "express") return 199;
  if (method === "standard") return Math.max(0, Math.min(999, Number(pricing.shipping || 0)));
  return Math.max(0, Math.min(999, Number(pricing.shipping || 0)));
}

function createOrderNumber() {
  return `AVY-${Date.now().toString().slice(-8)}`;
}

function calculateCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const minimumOrderAmount = Number(coupon.minimumOrderAmount || 0);
  if (subtotal < minimumOrderAmount) {
    throw new ApiError(400, `Coupon requires a minimum cart value of ${minimumOrderAmount}`);
  }

  const rawDiscount = coupon.discountType === "fixed"
    ? Number(coupon.discountValue || 0)
    : subtotal * (Number(coupon.discountValue || 0) / 100);
  const cappedDiscount = coupon.maximumDiscountAmount
    ? Math.min(rawDiscount, Number(coupon.maximumDiscountAmount || 0))
    : rawDiscount;

  return Math.max(0, Math.min(subtotal, Math.round(cappedDiscount)));
}

async function calculateCreditRedemption(connection, customerId, requestedPoints, subtotalAfterCoupon) {
  const pts = Math.floor(Number(requestedPoints || 0));
  if (!pts) return { pointsApplied: 0, discountRupees: 0, pointsPerRupee: 10 };
  if (!customerId) throw new ApiError(401, "Login is required to redeem credit points");

  const [settingsRows] = await connection.execute("SELECT * FROM credit_settings LIMIT 1");
  const settings = settingsRows[0] || {
    points_per_rupee: 10,
    min_redeem_points: 100,
    max_redeem_percent: 20
  };

  await connection.execute(
    "INSERT IGNORE INTO customer_credit_wallets (customer_id) VALUES (?)",
    [customerId]
  );

  const [walletRows] = await connection.execute(
    "SELECT * FROM customer_credit_wallets WHERE customer_id = ? FOR UPDATE",
    [customerId]
  );
  const wallet = walletRows[0];
  const pointsPerRupee = Number(settings.points_per_rupee || 10);
  const availablePoints = Number(wallet?.available_points || 0);

  if (wallet?.is_blocked) throw new ApiError(403, "Your credit points wallet is blocked.");
  if (availablePoints < Number(settings.min_redeem_points || 100)) {
    throw new ApiError(400, `You need at least ${settings.min_redeem_points || 100} points to redeem.`);
  }
  if (pts > availablePoints) {
    throw new ApiError(400, `You only have ${availablePoints} points available.`);
  }

  const maxDiscountRupees = Math.floor(Number(subtotalAfterCoupon || 0) * (Number(settings.max_redeem_percent || 20) / 100));
  const maxPointsAllowed = maxDiscountRupees * pointsPerRupee;
  const pointsApplied = Math.min(pts, maxPointsAllowed, availablePoints);
  const discountRupees = Math.floor(pointsApplied / pointsPerRupee);

  if (pointsApplied <= 0 || discountRupees <= 0) {
    throw new ApiError(400, "Credit points cannot be applied to this order.");
  }

  return { pointsApplied, discountRupees, pointsPerRupee };
}

export async function createOrder(request, response) {
  const {
    customer = {},
    address = {},
    items = [],
    pricing = {},
    paymentMethod = "cod",
    shippingMethod = "standard",
    couponCode = "",
    creditPoints = 0
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

  const shippingFee = normalizeShippingFee(shippingMethod, pricing);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let customerId = request.customer?.id || null;
    if (email) {
      const [existingCustomers] = await connection.execute(
        "SELECT id FROM customers WHERE id = ? OR email = ? LIMIT 1",
        [customerId || 0, email]
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
    const reduceStock = shouldReduceStock(paymentStatus);
    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const identifier = String(item.asin || item.slug || "").trim();
      if (!identifier) {
        throw new ApiError(400, "Each order item must include a product identifier");
      }

      const [productRows] = await connection.execute(
        `SELECT id, asin, slug, name, price, stock_quantity AS stockQuantity, status, is_visible AS isVisible, is_deleted AS isDeleted
         FROM products
         WHERE asin = ? OR slug = ?
         LIMIT 1
         FOR UPDATE`,
        [identifier, identifier]
      );
      const product = productRows[0];

      if (!product || product.isDeleted || !product.isVisible || product.status !== "active") {
        throw new ApiError(400, `Product ${identifier} is not available for checkout`);
      }

      const quantity = Math.max(1, Number(item.quantity || 1));
      const availableStock = Number(product.stockQuantity || 0);
      if (availableStock < quantity) {
        throw new ApiError(409, `${product.name} has only ${availableStock} unit(s) available`);
      }

      const unitPrice = Number(product.price || 0);
      const totalPrice = unitPrice * quantity;
      subtotal += totalPrice;
      normalizedItems.push({
        productId: product.id,
        name: product.name,
        quantity,
        unitPrice,
        totalPrice
      });
    }

    let coupon = null;
    if (couponCode) {
      const [couponRows] = await connection.execute(
        `SELECT
          id,
          code,
          discount_type AS discountType,
          discount_value AS discountValue,
          minimum_order_amount AS minimumOrderAmount,
          maximum_discount_amount AS maximumDiscountAmount,
          usage_limit AS usageLimit,
          used_count AS usedCount,
          starts_at AS startsAt,
          ends_at AS endsAt,
          status
         FROM coupons
         WHERE code = ?
           AND status = 'active'
           AND (starts_at IS NULL OR starts_at <= NOW())
           AND (ends_at IS NULL OR ends_at >= NOW())
           AND (usage_limit IS NULL OR used_count < usage_limit)
         LIMIT 1
         FOR UPDATE`,
        [String(couponCode).trim().toUpperCase()]
      );
      coupon = couponRows[0] || null;
      if (!coupon) {
        throw new ApiError(400, "Coupon is invalid, expired, paused, or fully used");
      }
    }

    const couponDiscount = calculateCouponDiscount(coupon, subtotal);
    const creditRedemption = await calculateCreditRedemption(connection, customerId, creditPoints, Math.max(0, subtotal - couponDiscount));
    const discount = couponDiscount + creditRedemption.discountRupees;
    const totalAmount = Math.max(0, subtotal - discount) + shippingFee;
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

    if (customerId) {
      const [addressRows] = await connection.execute(
        "SELECT id FROM customer_addresses WHERE customer_id = ? LIMIT 1",
        [customerId]
      );
      const makeDefault = addressRows.length ? 0 : 1;
      await connection.execute(
        `INSERT INTO customer_addresses
          (customer_id, address_type, full_name, phone, line1, line2, city, state, pincode, country, is_default)
         VALUES (?, 'Home', ?, ?, ?, ?, ?, ?, ?, 'India', ?)`,
        [
          customerId,
          fullName,
          phone,
          line1,
          address.line2 || null,
          city,
          state,
          pincode,
          makeDefault
        ]
      );
    }

    for (const item of normalizedItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.name, item.quantity, item.unitPrice, item.totalPrice]
      );

      if (reduceStock) {
        const [stockResult] = await connection.execute(
          `UPDATE products
           SET stock_quantity = stock_quantity - ?, sold_quantity = sold_quantity + ?
           WHERE id = ? AND stock_quantity >= ?`,
          [item.quantity, item.quantity, item.productId, item.quantity]
        );
        if (!stockResult.affectedRows) {
          throw new ApiError(409, `${item.name} is no longer available in the requested quantity`);
        }
      }
    }

    if (reduceStock && coupon && couponDiscount > 0) {
      await connection.execute("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", [coupon.id]);
    }

    if (creditRedemption.pointsApplied > 0) {
      await connection.execute(
        `UPDATE customer_credit_wallets
         SET available_points = available_points - ?,
             used_points = used_points + ?
         WHERE customer_id = ?`,
        [creditRedemption.pointsApplied, creditRedemption.pointsApplied, customerId]
      );
      await connection.execute(
        `INSERT INTO credit_transactions
           (customer_id, transaction_type, points, cashback_value, reference_id, reference_type, note, status)
         VALUES (?, 'redemption', ?, ?, ?, 'order', ?, 'used')`,
        [
          customerId,
          -creditRedemption.pointsApplied,
          creditRedemption.discountRupees,
          String(orderId),
          `Redeemed on order ${orderNumber}`
        ]
      );
    }

    await connection.execute(
      `INSERT INTO order_status_timeline (order_id, status, title, note, event_time)
       VALUES (?, 'pending', 'Order pending', ?, NOW())`,
      [
        orderId,
        [
          couponCode ? `Coupon ${couponCode} applied` : "",
          creditRedemption.pointsApplied > 0 ? `${creditRedemption.pointsApplied} credit points redeemed` : "",
          `Shipping method: ${shippingMethod}`
        ].filter(Boolean).join(". ")
      ]
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
        couponDiscount,
        creditDiscount: creditRedemption.discountRupees,
        creditPointsRedeemed: creditRedemption.pointsApplied,
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

export async function trackOrder(request, response) {
  const orderNumber = String(request.body?.orderNumber || request.body?.orderId || request.query?.orderNumber || request.query?.orderId || "").trim();
  const contact = String(request.body?.contact || request.body?.identity || request.query?.contact || request.query?.identity || "").trim().toLowerCase();

  if (!orderNumber || !contact) {
    throw new ApiError(400, "Order ID and email/phone are required");
  }

  const orderRows = await query(
    `SELECT
      o.id,
      o.order_number AS orderNumber,
      o.status,
      o.payment_status AS paymentStatus,
      o.payment_method AS paymentMethod,
      o.courier_name AS courierName,
      o.expected_delivery_date AS expectedDeliveryDate,
      o.total_amount AS totalAmount,
      o.created_at AS createdAt,
      oa.full_name AS fullName,
      oa.email,
      oa.phone,
      oa.line1,
      oa.line2,
      oa.landmark,
      oa.city,
      oa.state,
      oa.pincode,
      oa.country
     FROM orders o
     LEFT JOIN order_addresses oa ON oa.order_id = o.id
     WHERE LOWER(o.order_number) = LOWER(?)
       AND (LOWER(oa.email) = ? OR LOWER(oa.phone) = ?)
     LIMIT 1`,
    [orderNumber, contact, contact]
  );
  const order = orderRows[0];

  if (!order) {
    throw new ApiError(404, "We could not find an order matching that Order ID and email/phone combination.");
  }

  const [items, timeline] = await Promise.all([
    query(
      `SELECT
        oi.id,
        oi.product_name AS name,
        oi.quantity,
        oi.unit_price AS price,
        oi.total_price AS total,
        p.slug,
        p.image_url AS image
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [order.id]
    ),
    query(
      `SELECT status, title, note, event_time AS dateTime
       FROM order_status_timeline
       WHERE order_id = ?
       ORDER BY event_time ASC, id ASC`,
      [order.id]
    )
  ]);

  response.json({
    success: true,
    data: {
      orderId: order.orderNumber,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      courierName: order.courierName || "",
      expectedDeliveryDate: order.expectedDeliveryDate,
      summary: {
        placedAt: order.createdAt,
        totalAmount: Number(order.totalAmount || 0)
      },
      deliveryAddress: {
        fullName: order.fullName,
        email: order.email || "",
        phone: order.phone || "",
        line1: order.line1 || "",
        line2: order.line2 || order.landmark || "",
        city: order.city || "",
        state: order.state || "",
        pincode: order.pincode || "",
        country: order.country || "India"
      },
      orderedItems: items.map((item) => ({
        ...item,
        price: Number(item.price || 0),
        total: Number(item.total || 0),
        image: item.image || "/images/optimized/frame-1.webp"
      })),
      statusTimeline: timeline
    }
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
  const connection = await pool.getConnection();
  let currentOrder;
  let updatedOrder;
  let transitionedToDelivered = false;

  try {
    await connection.beginTransaction();

    const [currentRows] = await connection.execute(
      `SELECT id, customer_id AS customerId, order_number AS orderNumber, status,
              payment_method AS paymentMethod, total_amount AS totalAmount,
              courier_name AS courierName, expected_delivery_date AS expectedDeliveryDate
       FROM orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [orderId]
    );

    currentOrder = currentRows[0];

    if (!currentOrder) {
      throw new ApiError(404, "Order not found");
    }

    await connection.execute(
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
      await connection.execute(
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

    const [rows] = await connection.execute(
      `SELECT id, order_number AS orderNumber, status, payment_method AS paymentMethod, total_amount AS totalAmount,
              courier_name AS courierName, expected_delivery_date AS expectedDeliveryDate
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [orderId]
    );

    updatedOrder = rows[0];
    transitionedToDelivered = normalizedStatus === "delivered" && currentOrder.status !== "delivered" && currentOrder.customerId;

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  response.json({
    success: true,
    data: updatedOrder
  });

  // Fire credit rewards when an order reaches 'delivered' for the first time
  if (transitionedToDelivered) {
    grantReferralBonus(currentOrder.customerId, { orderId }).catch(() => {});
    grantPurchaseCashback(currentOrder.customerId, orderId, updatedOrder.totalAmount).catch(() => {});
    grantMilestoneReward(currentOrder.customerId, orderId).catch(() => {});
  }
}
