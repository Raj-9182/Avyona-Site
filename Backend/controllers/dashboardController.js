import { query } from "../config/db.js";

export async function getDashboardSummary(_request, response) {
  const [productCountRow] = await query("SELECT COUNT(*) AS totalProducts FROM products");
  const [categoryCountRow] = await query("SELECT COUNT(*) AS totalCategories FROM categories");
  const [customerCountRow] = await query("SELECT COUNT(*) AS totalCustomers FROM customers");
  const [orderCountRow] = await query("SELECT COUNT(*) AS totalOrders FROM orders");
  const [revenueRow] = await query("SELECT COALESCE(SUM(total_amount), 0) AS totalRevenue FROM orders");

  const lowStockProducts = await query(
    `SELECT id, name, slug, stock_quantity AS stockQuantity, status
     FROM products
     WHERE stock_quantity BETWEEN 1 AND 5
     ORDER BY stock_quantity ASC, updated_at DESC
     LIMIT 5`
  );

  const latestOrders = await query(
    `SELECT
      o.id,
      o.order_number AS orderNumber,
      c.full_name AS customerName,
      o.status,
      o.total_amount AS totalAmount,
      o.created_at AS createdAt
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     ORDER BY o.created_at DESC
     LIMIT 5`
  );

  const topCategories = await query(
    `SELECT c.id, c.name, c.slug, COUNT(p.id) AS productCount
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id, c.name, c.slug
     ORDER BY productCount DESC, c.name ASC
     LIMIT 5`
  );

  response.json({
    success: true,
    data: {
      metrics: {
        products: Number(productCountRow.totalProducts || 0),
        categories: Number(categoryCountRow.totalCategories || 0),
        customers: Number(customerCountRow.totalCustomers || 0),
        orders: Number(orderCountRow.totalOrders || 0),
        revenue: Number(revenueRow.totalRevenue || 0)
      },
      lowStockProducts,
      latestOrders,
      topCategories
    }
  });
}
