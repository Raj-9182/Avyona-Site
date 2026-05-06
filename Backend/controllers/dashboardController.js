import { query } from "../config/db.js";

function parsePositiveInteger(value, fallback, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.floor(number), max);
}

function parseDateValue(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function parseMonthValue(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}$/.test(text)) return null;
  return text;
}

function parseYearValue(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}$/.test(text)) return null;
  return text;
}

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getRangeParam(query, prefix, name) {
  if (!prefix) return query[name];
  const prefixedName = `${prefix}${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const lowerPrefixedName = `${prefix}${name}`;
  return query[prefixedName] ?? query[lowerPrefixedName];
}

function buildDateRange(query, prefix = "") {
  const mode = String(getRangeParam(query, prefix, "mode") || getRangeParam(query, prefix, "periodMode") || "last30").trim();
  const today = getTodayIsoDate();

  if (mode === "date") {
    const date = parseDateValue(getRangeParam(query, prefix, "date")) || today;
    return { mode, startDate: date, endDate: date };
  }

  if (mode === "month") {
    const month = parseMonthValue(getRangeParam(query, prefix, "month")) || today.slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return { mode, startDate: `${month}-01`, endDate: `${month}-${String(lastDay).padStart(2, "0")}` };
  }

  if (mode === "year") {
    const year = parseYearValue(getRangeParam(query, prefix, "year")) || today.slice(0, 4);
    return { mode, startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  if (mode === "custom") {
    const startDate = parseDateValue(getRangeParam(query, prefix, "startDate")) || today;
    const endDate = parseDateValue(getRangeParam(query, prefix, "endDate")) || startDate;
    return startDate <= endDate
      ? { mode, startDate, endDate }
      : { mode, startDate: endDate, endDate: startDate };
  }

  return { mode: "last30", startDate: null, endDate: null };
}

function parseAnalyticsOptions(request) {
  const range = buildDateRange(request.query);
  const compareEnabled = String(request.query.compare || "").trim() === "true";
  const compareRange = compareEnabled ? buildDateRange(request.query, "compare") : null;

  return {
    limit: parsePositiveInteger(request.query.limit, 8, 50),
    page: parsePositiveInteger(request.query.page, 1, 10000),
    productSearch: String(request.query.productSearch || "").trim().slice(0, 120),
    searchQuery: String(request.query.searchQuery || "").trim().slice(0, 120),
    range,
    compareEnabled,
    compareRange
  };
}

function getDateWhereClause(alias, range) {
  const column = alias ? `${alias}.\`date\`` : "`date`";
  if (range.startDate && range.endDate) {
    return { sql: `${column} BETWEEN ? AND ?`, values: [range.startDate, range.endDate] };
  }

  return { sql: `${column} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)`, values: [] };
}

function getTimestampWhereClause(alias, range) {
  const column = alias ? `${alias}.created_at` : "created_at";
  if (range.startDate && range.endDate) {
    return {
      sql: `${column} >= ? AND ${column} < DATE_ADD(?, INTERVAL 1 DAY)`,
      values: [range.startDate, range.endDate]
    };
  }

  return { sql: `${column} >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)`, values: [] };
}

function getDateEqualsTodayClause(alias) {
  const column = alias ? `${alias}.\`date\`` : "`date`";
  return `${column} = CURDATE()`;
}

function percent(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

async function getFunnelSummary(range) {
  const dateWhere = getDateWhereClause("", range);
  const [funnelRow] = await query(
    `SELECT
      COALESCE(SUM(sessions), 0) AS sessions,
      COALESCE(SUM(users), 0) AS users,
      COALESCE(SUM(product_views), 0) AS productViews,
      COALESCE(SUM(searches), 0) AS searchQueries,
      COALESCE(SUM(add_to_cart), 0) AS addToCart,
      COALESCE(SUM(checkout), 0) AS checkoutStart,
      COALESCE(SUM(purchase), 0) AS purchases,
      COALESCE(SUM(abandoned_carts), 0) AS abandonedCarts,
      COALESCE(SUM(category_views), 0) AS categoryViews,
      COALESCE(SUM(remove_from_cart), 0) AS removeFromCart,
      COALESCE(SUM(wishlist_add), 0) AS wishlistAdd,
      COALESCE(SUM(filter_applied), 0) AS filterApplied
     FROM daily_funnel_metrics
     WHERE ${dateWhere.sql}`,
    dateWhere.values
  );

  const funnel = {
    sessions: Number(funnelRow.sessions || 0),
    users: Number(funnelRow.users || 0),
    productViews: Number(funnelRow.productViews || 0),
    searchQueries: Number(funnelRow.searchQueries || 0),
    addToCart: Number(funnelRow.addToCart || 0),
    checkoutStart: Number(funnelRow.checkoutStart || 0),
    purchases: Number(funnelRow.purchases || 0),
    abandonedCarts: Number(funnelRow.abandonedCarts || 0)
  };

  const supporting = {
    categoryViews: Number(funnelRow.categoryViews || 0),
    removeFromCart: Number(funnelRow.removeFromCart || 0),
    wishlistAdd: Number(funnelRow.wishlistAdd || 0),
    filterApplied: Number(funnelRow.filterApplied || 0)
  };

  return {
    overview: {
      totalSessions: funnel.sessions,
      totalUsers: funnel.users,
      conversionRate: percent(funnel.purchases, funnel.sessions)
    },
    funnel,
    supporting,
    rates: {
      addToCartRate: percent(funnel.addToCart, funnel.productViews),
      checkoutRate: percent(funnel.checkoutStart, funnel.addToCart),
      purchaseRate: percent(funnel.purchases, funnel.checkoutStart)
    },
    dropOffs: {
      visitorToProductView: Math.max(0, funnel.sessions - funnel.productViews),
      productViewToCart: Math.max(0, funnel.productViews - funnel.addToCart),
      cartToCheckout: Math.max(0, funnel.addToCart - funnel.checkoutStart),
      checkoutToPurchase: Math.max(0, funnel.checkoutStart - funnel.purchases)
    }
  };
}

export async function getDashboardSummary(request, response) {
  const range = buildDateRange(request.query);
  const productWhere = getTimestampWhereClause("p", range);
  const customerWhere = getTimestampWhereClause("c", range);
  const orderWhere = getTimestampWhereClause("o", range);

  const [productCountRow] = await query(`SELECT COUNT(*) AS totalProducts FROM products p WHERE ${productWhere.sql}`, productWhere.values);
  const [categoryCountRow] = await query("SELECT COUNT(*) AS totalCategories FROM categories");
  const [customerCountRow] = await query(`SELECT COUNT(*) AS totalCustomers FROM customers c WHERE ${customerWhere.sql}`, customerWhere.values);
  const [orderCountRow] = await query(`SELECT COUNT(*) AS totalOrders FROM orders o WHERE ${orderWhere.sql}`, orderWhere.values);
  const [revenueRow] = await query(`SELECT COALESCE(SUM(o.total_amount), 0) AS totalRevenue FROM orders o WHERE ${orderWhere.sql}`, orderWhere.values);

  const lowStockProducts = await query(
    `SELECT p.id, p.name, p.slug, p.image_url AS image, p.sku, p.stock_quantity AS stockQuantity, p.status
     FROM products p
     WHERE p.stock_quantity BETWEEN 1 AND 5
       AND ${productWhere.sql}
     ORDER BY p.stock_quantity ASC, p.updated_at DESC
     LIMIT 5`
    ,
    productWhere.values
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
     WHERE ${orderWhere.sql}
       AND o.status NOT IN ('delivered', 'cancelled', 'returned')
     ORDER BY o.created_at DESC
     LIMIT 5`,
    orderWhere.values
  );

  const orderStatusRows = await query(
    `SELECT o.status, COUNT(*) AS count
     FROM orders o
     WHERE ${orderWhere.sql}
     GROUP BY o.status`,
    orderWhere.values
  );

  const [paymentHealthRow] = await query(
    `SELECT
      COUNT(*) AS totalOrders,
      SUM(CASE WHEN o.payment_status IN ('paid', 'authorized') THEN 1 ELSE 0 END) AS paidOrders
     FROM orders o
     WHERE ${orderWhere.sql}`,
    orderWhere.values
  );

  const topCategories = await query(
    `SELECT c.id, c.name, c.slug, COUNT(p.id) AS productCount
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
       AND ${productWhere.sql}
     GROUP BY c.id, c.name, c.slug
     ORDER BY productCount DESC, c.name ASC
     LIMIT 5`,
    productWhere.values
  );
  const orderStatusCounts = orderStatusRows.reduce((counts, row) => {
    counts[row.status] = Number(row.count || 0);
    return counts;
  }, {});
  const paidOrders = Number(paymentHealthRow.paidOrders || 0);
  const filteredOrders = Number(paymentHealthRow.totalOrders || 0);

  response.json({
    success: true,
    data: {
      range,
      metrics: {
        products: Number(productCountRow.totalProducts || 0),
        categories: Number(categoryCountRow.totalCategories || 0),
        customers: Number(customerCountRow.totalCustomers || 0),
        orders: Number(orderCountRow.totalOrders || 0),
        revenue: Number(revenueRow.totalRevenue || 0)
      },
      operations: {
        orderStatusCounts,
        paymentHealth: filteredOrders ? Math.round((paidOrders / filteredOrders) * 100) : 0,
        paidOrders,
        totalOrders: filteredOrders
      },
      lowStockProducts,
      latestOrders,
      topCategories
    }
  });
}

export async function getDashboardAnalytics(request, response) {
  const options = parseAnalyticsOptions(request);
  const offset = (options.page - 1) * options.limit;
  const dateWhere = getDateWhereClause("", options.range);
  const productFilter = options.productSearch
    ? "AND (product_name LIKE ? OR product_slug LIKE ? OR product_asin LIKE ?)"
    : "";
  const productValues = options.productSearch
    ? [`%${options.productSearch}%`, `%${options.productSearch}%`, `%${options.productSearch}%`]
    : [];
  const searchFilter = options.searchQuery ? "AND search_query LIKE ?" : "";
  const searchValues = options.searchQuery ? [`%${options.searchQuery}%`] : [];

  const [totalEventsRow] = await query(
    `SELECT COALESCE(SUM(product_views + searches + add_to_cart + checkout + purchase + abandoned_carts + category_views + remove_from_cart + wishlist_add + filter_applied), 0) AS totalEvents
     FROM daily_funnel_metrics
     WHERE ${dateWhere.sql}`,
    dateWhere.values
  );
  const [todayEventsRow] = await query(
    `SELECT COALESCE(SUM(product_views + searches + add_to_cart + checkout + purchase + abandoned_carts + category_views + remove_from_cart + wishlist_add + filter_applied), 0) AS todayEvents
     FROM daily_funnel_metrics
     WHERE ${getDateEqualsTodayClause("")}`
  );

  const summary = await getFunnelSummary(options.range);

  const topViewedProducts = await query(
    `SELECT
      COALESCE(MAX(product_name), MAX(product_slug), MAX(product_asin), 'Unknown product') AS name,
      MAX(product_slug) AS slug,
      MAX(product_asin) AS asin,
      SUM(views) AS views
     FROM daily_product_metrics
     WHERE ${dateWhere.sql}
       ${productFilter}
     GROUP BY product_key
     ORDER BY views DESC, name ASC
     LIMIT ? OFFSET ?`,
    [...dateWhere.values, ...productValues, options.limit, offset]
  );

  const mostPurchasedProducts = await query(
    `SELECT
      COALESCE(MAX(product_name), MAX(product_slug), MAX(product_asin), 'Unknown product') AS name,
      MAX(product_slug) AS slug,
      MAX(product_asin) AS asin,
      SUM(purchases) AS purchases,
      SUM(views) AS views
     FROM daily_product_metrics
     WHERE ${dateWhere.sql}
       ${productFilter}
     GROUP BY product_key
     HAVING purchases > 0
     ORDER BY purchases DESC, views DESC, name ASC
     LIMIT ? OFFSET ?`,
    [...dateWhere.values, ...productValues, options.limit, offset]
  );

  const lowConversionProducts = await query(
    `SELECT
      COALESCE(MAX(product_name), MAX(product_slug), MAX(product_asin), 'Unknown product') AS name,
      MAX(product_slug) AS slug,
      MAX(product_asin) AS asin,
      SUM(views) AS views,
      SUM(purchases) AS purchases,
      ROUND((SUM(purchases) / NULLIF(SUM(views), 0)) * 100) AS conversionRate
     FROM daily_product_metrics
     WHERE ${dateWhere.sql}
       ${productFilter}
     GROUP BY product_key
     HAVING views >= 1 AND conversionRate < 20
     ORDER BY conversionRate ASC, views DESC, name ASC
     LIMIT ? OFFSET ?`,
    [...dateWhere.values, ...productValues, options.limit, offset]
  );

  const topSearchQueries = await query(
    `SELECT
      search_query AS query,
      SUM(\`count\`) AS total,
      ROUND(SUM(total_result_count) / NULLIF(SUM(\`count\`), 0)) AS averageResultCount,
      SUM(zero_result_count) AS zeroResultCount,
      SUM(clicked_product_count) AS clickedProductCount,
      MAX(last_clicked_product_id) AS lastClickedProductId
     FROM daily_search_metrics
     WHERE ${dateWhere.sql}
       ${searchFilter}
     GROUP BY search_query
     ORDER BY total DESC, search_query ASC
     LIMIT ? OFFSET ?`,
    [...dateWhere.values, ...searchValues, options.limit, offset]
  );

  const noResultSearches = await query(
    `SELECT
      search_query AS query,
      SUM(zero_result_count) AS zeroResultCount,
      SUM(\`count\`) AS total,
      MAX(last_clicked_product_id) AS lastClickedProductId
     FROM daily_search_metrics
     WHERE ${dateWhere.sql}
       ${searchFilter}
     GROUP BY search_query
     HAVING zeroResultCount > 0
     ORDER BY zeroResultCount DESC, total DESC, search_query ASC
     LIMIT ? OFFSET ?`,
    [...dateWhere.values, ...searchValues, options.limit, offset]
  );

  const topCategories = await query(
    `SELECT
      COALESCE(MAX(category_name), MAX(category_slug), 'Unknown category') AS name,
      MAX(category_slug) AS slug,
      SUM(views) AS views,
      SUM(conversions) AS conversions
     FROM daily_category_metrics
     WHERE ${dateWhere.sql}
     GROUP BY category_key
     ORDER BY views DESC, conversions DESC, name ASC
     LIMIT ?`,
    [...dateWhere.values, options.limit]
  );

  const comparison = options.compareEnabled && options.compareRange
    ? {
      current: {
        range: options.range,
        ...(await getFunnelSummary(options.range))
      },
      compare: {
        range: options.compareRange,
        ...(await getFunnelSummary(options.compareRange))
      }
    }
    : null;

  response.json({
    success: true,
    data: {
      totals: {
        totalEvents: Number(totalEventsRow.totalEvents || 0),
        todayEvents: Number(todayEventsRow.todayEvents || 0),
        conversionRate: summary.rates.purchaseRate
      },
      range: options.range,
      comparison,
      overview: summary.overview,
      funnel: summary.funnel,
      rates: summary.rates,
      dropOffs: summary.dropOffs,
      supporting: summary.supporting,
      productInsights: {
        pagination: { page: options.page, limit: options.limit },
        mostViewed: topViewedProducts,
        mostPurchased: mostPurchasedProducts,
        lowConversion: lowConversionProducts
      },
      searchInsights: {
        pagination: { page: options.page, limit: options.limit },
        topSearches: topSearchQueries,
        noResultSearches
      },
      topViewedProducts,
      topSearchQueries,
      topCategories,
      recentEvents: []
    }
  });
}
