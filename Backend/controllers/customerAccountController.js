import bcrypt from "bcryptjs";
import { pool, query } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import { signCustomerToken } from "../utils/jwt.js";

function publicCustomer(customer) {
  const [firstName = "", ...lastParts] = String(customer.fullName || "").split(/\s+/).filter(Boolean);
  return {
    id: customer.id,
    fullName: customer.fullName,
    email: customer.email,
    mobile: customer.phone || "",
    firstName,
    lastName: lastParts.join(" "),
    city: customer.city || "",
    state: customer.state || ""
  };
}

function getProductIdentifier(item) {
  return String(item.asin || item.slug || "").trim();
}

function mapProductRow(row) {
  return {
    slug: row.slug,
    asin: row.asin,
    name: row.name,
    category: row.categoryName || "Products",
    price: Number(row.price || 0),
    quantity: Number(row.quantity || 1),
    image: row.imageUrl || "/images/optimized/frame-1.webp",
    variantLabel: row.variantLabel || ""
  };
}

async function findProduct(connection, item) {
  const identifier = getProductIdentifier(item);
  if (!identifier) return null;

  const [rows] = await connection.execute(
    `SELECT id, asin, slug, name, price, image_url AS imageUrl
     FROM products
     WHERE (asin = ? OR slug = ?)
       AND status = 'active'
       AND is_visible = 1
       AND is_deleted = 0
     LIMIT 1`,
    [identifier, identifier]
  );

  return rows[0] || null;
}

async function getOrCreateCart(connection, customerId) {
  const [cartRows] = await connection.execute(
    "SELECT id FROM carts WHERE customer_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
    [customerId]
  );

  if (cartRows[0]) return cartRows[0].id;

  const [result] = await connection.execute(
    "INSERT INTO carts (customer_id, status) VALUES (?, 'active')",
    [customerId]
  );

  return result.insertId;
}

export async function signupCustomer(request, response) {
  const fullName = String(request.body?.fullName || "").trim();
  const email = String(request.body?.email || "").trim().toLowerCase();
  const phone = String(request.body?.mobile || request.body?.phone || "").trim();
  const password = String(request.body?.password || "");

  if (!fullName || !email || !phone || password.length < 6) {
    throw new ApiError(400, "Full name, email, mobile, and a 6+ character password are required");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await query("SELECT id, password_hash AS passwordHash FROM customers WHERE email = ? LIMIT 1", [email]);

  if (existing[0]?.passwordHash) {
    throw new ApiError(409, "An account with that email already exists");
  }

  let customerId = existing[0]?.id || null;
  if (customerId) {
    await query(
      `UPDATE customers
       SET full_name = ?, phone = ?, password_hash = ?, status = 'active'
       WHERE id = ?`,
      [fullName, phone, passwordHash, customerId]
    );
  } else {
    const result = await query(
      `INSERT INTO customers (full_name, email, phone, password_hash, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [fullName, email, phone, passwordHash]
    );
    customerId = result.insertId;
  }

  const rows = await query("SELECT id, full_name AS fullName, email, phone, city, state FROM customers WHERE id = ? LIMIT 1", [customerId]);
  const customer = rows[0];

  response.status(201).json({
    success: true,
    data: {
      token: signCustomerToken(customer),
      customer: publicCustomer(customer)
    }
  });
}

export async function loginCustomer(request, response) {
  const identity = String(request.body?.identity || "").trim().toLowerCase();
  const password = String(request.body?.password || "");

  if (!identity || !password) {
    throw new ApiError(400, "Email/mobile and password are required");
  }

  const rows = await query(
    `SELECT id, full_name AS fullName, email, phone, city, state, password_hash AS passwordHash, status
     FROM customers
     WHERE LOWER(email) = ? OR LOWER(phone) = ?
     LIMIT 1`,
    [identity, identity]
  );
  const customer = rows[0];

  if (!customer || !customer.passwordHash || !(await bcrypt.compare(password, customer.passwordHash))) {
    throw new ApiError(401, "We could not match those account details");
  }

  if (customer.status !== "active") {
    throw new ApiError(403, "This account is not active");
  }

  await query("UPDATE customers SET last_login_at = NOW() WHERE id = ?", [customer.id]);

  response.json({
    success: true,
    data: {
      token: signCustomerToken(customer),
      customer: publicCustomer(customer)
    }
  });
}

export async function getCurrentCustomer(request, response) {
  response.json({
    success: true,
    data: {
      customer: publicCustomer(request.customer)
    }
  });
}

export async function getCustomerCart(request, response) {
  const rows = await query(
    `SELECT
      p.slug,
      p.asin,
      p.name,
      c.name AS categoryName,
      ci.quantity,
      ci.price_at_time AS price,
      p.image_url AS imageUrl
     FROM carts cart
     INNER JOIN cart_items ci ON ci.cart_id = cart.id
     INNER JOIN products p ON p.id = ci.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE cart.customer_id = ?
       AND cart.status = 'active'
       AND p.is_deleted = 0
     ORDER BY ci.updated_at DESC`,
    [request.customer.id]
  );

  response.json({
    success: true,
    data: rows.map(mapProductRow)
  });
}

export async function syncCustomerCart(request, response) {
  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const cartId = await getOrCreateCart(connection, request.customer.id);
    await connection.execute("DELETE FROM cart_items WHERE cart_id = ?", [cartId]);

    for (const item of items) {
      const product = await findProduct(connection, item);
      if (!product) continue;
      const quantity = Math.max(1, Math.min(99, Number(item.quantity || 1)));
      const price = Number(item.price || product.price || 0);
      await connection.execute(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price_at_time)
         VALUES (?, ?, NULL, ?, ?)`,
        [cartId, product.id, quantity, price]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await getCustomerCart(request, response);
}

export async function getCustomerWishlist(request, response) {
  const rows = await query(
    `SELECT
      p.slug,
      p.asin,
      p.name,
      c.name AS categoryName,
      1 AS quantity,
      p.price,
      p.image_url AS imageUrl
     FROM wishlists w
     INNER JOIN products p ON p.id = w.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE w.customer_id = ?
       AND p.is_deleted = 0
     ORDER BY w.created_at DESC`,
    [request.customer.id]
  );

  response.json({
    success: true,
    data: rows.map(mapProductRow)
  });
}

export async function syncCustomerWishlist(request, response) {
  const items = Array.isArray(request.body?.items) ? request.body.items : [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM wishlists WHERE customer_id = ?", [request.customer.id]);

    for (const item of items) {
      const product = await findProduct(connection, item);
      if (!product) continue;
      await connection.execute(
        "INSERT IGNORE INTO wishlists (customer_id, product_id) VALUES (?, ?)",
        [request.customer.id, product.id]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await getCustomerWishlist(request, response);
}

export async function getCustomerOrders(request, response) {
  const rows = await query(
    `SELECT
      o.id,
      o.order_number AS orderNumber,
      o.status,
      o.payment_status AS paymentStatus,
      o.payment_method AS paymentMethod,
      o.total_amount AS totalAmount,
      o.created_at AS createdAt,
      oi.product_name AS name,
      oi.quantity,
      oi.total_price AS total,
      p.slug,
      p.image_url AS image,
      c.name AS category
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE o.customer_id = ?
     ORDER BY o.created_at DESC, oi.id ASC`,
    [request.customer.id]
  );

  response.json({
    success: true,
    data: rows.map((row) => ({
      ...row,
      total: Number(row.total || row.totalAmount || 0),
      date: row.createdAt,
      image: row.image || "/images/optimized/frame-1.webp",
      category: row.category || "Products"
    }))
  });
}
