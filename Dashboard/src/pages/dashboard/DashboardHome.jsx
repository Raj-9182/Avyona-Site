import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardSummary } from "../../api/adminApi";
import { formatCurrency } from "../../utils/storefront";
import products from "../../data/products";
import orders from "../../data/orders";
import customers from "../../data/customers";

function getFallbackMetrics(context, allProducts) {
  const localRevenue = orders.reduce((sum, order) => sum + Number(order.pricing?.grandTotal || order.total || 0), 0);
  const sessionRevenue = (context.orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    products: products.length || allProducts.length,
    orders: orders.length || (context.orders || []).length,
    customers: customers.length || (context.accounts || []).length,
    revenue: localRevenue || sessionRevenue
  };
}

function getOrderStatusCount(status) {
  return orders.filter((order) => order.orderStatus === status).length;
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function DashboardHome({ context, allProducts }) {
  const fallbackMetrics = getFallbackMetrics(context, allProducts);
  const [metrics, setMetrics] = useState(fallbackMetrics);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardSummary = async () => {
      try {
        const response = await fetchDashboardSummary();
        const summaryMetrics = response.data?.data?.metrics;

        if (!isMounted || !summaryMetrics) return;

        setMetrics({
          products: Number(summaryMetrics.products ?? fallbackMetrics.products),
          orders: Number(summaryMetrics.orders ?? fallbackMetrics.orders),
          customers: Number(summaryMetrics.customers ?? fallbackMetrics.customers),
          revenue: Number(summaryMetrics.revenue ?? fallbackMetrics.revenue)
        });
      } catch {
        if (!isMounted) return;
        setMetrics(fallbackMetrics);
      }
    };

    loadDashboardSummary();

    return () => {
      isMounted = false;
    };
  }, [fallbackMetrics]);

  const cards = [
    { title: "Revenue", value: formatCurrency(metrics.revenue), note: "From visible local order records" },
    { title: "Orders", value: metrics.orders, note: `${getOrderStatusCount("pending") + getOrderStatusCount("confirmed")} need review` },
    { title: "Products", value: metrics.products, note: `${products.filter((product) => product.stockStatus !== "in-stock").length} stock alerts` },
    { title: "Customers", value: metrics.customers, note: "Known customer accounts" }
  ];
  const lowStockProducts = products
    .filter((product) => product.stockStatus !== "in-stock")
    .sort((left, right) => Number(left.stock || 0) - Number(right.stock || 0))
    .slice(0, 5);
  const fulfillmentQueue = orders
    .filter((order) => !["delivered", "cancelled", "returned"].includes(order.orderStatus))
    .slice(0, 5);
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid" || order.paymentStatus === "authorized").length;
  const paymentHealth = orders.length ? (paidOrders / orders.length) * 100 : 0;
  const operationalStats = [
    { label: "Pending", value: getOrderStatusCount("pending") },
    { label: "Packed", value: getOrderStatusCount("packed") },
    { label: "Shipped", value: getOrderStatusCount("shipped") },
    { label: "Payment Health", value: formatPercent(paymentHealth) }
  ];

  return (
    <section className="dashboard-home-section" style={pageStyle}>
      <div className="dashboard-panel-head">
        <div>
          <p className="dashboard-panel-label">Overview</p>
          <h2 style={{ margin: "0.35rem 0 0" }}>Dashboard Overview</h2>
          <p style={mutedTextStyle}>Daily ecommerce snapshot for catalog health, fulfillment, and customer activity.</p>
        </div>
        <div style={headerActionsStyle}>
          <Link to="/dashboard/orders" style={secondaryLinkStyle}>Review Orders</Link>
          <Link to="/dashboard/products/new" style={primaryLinkStyle}>Add Product</Link>
        </div>
      </div>
      <div className="dashboard-stat-grid dashboard-stat-grid-home">
        {cards.map((card) => (
          <div key={card.title} className="dashboard-stat-card dashboard-stat-card-home">
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <small style={cardNoteStyle}>{card.note}</small>
          </div>
        ))}
      </div>

      <section style={insightGridStyle}>
        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>Operations</p>
              <h3 style={panelTitleStyle}>Fulfillment Queue</h3>
            </div>
            <Link to="/dashboard/orders" style={smallLinkStyle}>Open Orders</Link>
          </div>
          <div style={metricStripStyle}>
            {operationalStats.map((item) => (
              <div key={item.label} style={miniMetricStyle}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <div style={listStyle}>
            {fulfillmentQueue.map((order) => (
              <div key={order.id} style={listItemStyle}>
                <div>
                  <strong>{order.orderNumber}</strong>
                  <p style={mutedTextStyle}>{`${order.customer.fullName} - ${order.orderStatus.replace(/_/g, " ")}`}</p>
                </div>
                <strong>{formatCurrency(order.pricing.grandTotal)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <p style={eyebrowStyle}>Inventory</p>
              <h3 style={panelTitleStyle}>Stock Alerts</h3>
            </div>
            <Link to="/dashboard/products" style={smallLinkStyle}>Manage Stock</Link>
          </div>
          <div style={listStyle}>
            {lowStockProducts.length ? lowStockProducts.map((product) => (
              <div key={product.slug} style={listItemStyle}>
                <div style={productRowStyle}>
                  <img src={product.image} alt={product.name} style={productImageStyle} />
                  <div>
                    <strong>{product.name}</strong>
                    <p style={mutedTextStyle}>{`${product.sku} - ${product.stockStatus.replace(/-/g, " ")}`}</p>
                  </div>
                </div>
                <strong>{product.stock}</strong>
              </div>
            )) : (
              <div style={emptyStateStyle}>No stock alerts right now.</div>
            )}
          </div>
        </article>
      </section>

      <section style={actionGridStyle}>
        <Link to="/dashboard/orders" style={actionCardStyle}>
          <strong>Process new orders</strong>
          <span>Review payment status, packing state, and courier assignment.</span>
        </Link>
        <Link to="/dashboard/products" style={actionCardStyle}>
          <strong>Clean product catalog</strong>
          <span>Check stock, inactive items, featured products, and pricing.</span>
        </Link>
        <Link to="/dashboard/customers" style={actionCardStyle}>
          <strong>Review customers</strong>
          <span>Open customer records, high-value buyers, and verification state.</span>
        </Link>
      </section>
    </section>
  );
}

const pageStyle = {
  display: "grid",
  gap: "20px"
};

const headerActionsStyle = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const primaryLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  padding: "0 16px",
  borderRadius: "10px",
  background: "#0f172a",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700
};

const secondaryLinkStyle = {
  ...primaryLinkStyle,
  background: "#fff",
  color: "#334155",
  border: "1px solid #d4dbe6"
};

const smallLinkStyle = {
  color: "#0f766e",
  fontWeight: 800,
  textDecoration: "none",
  fontSize: "13px"
};

const mutedTextStyle = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px"
};

const cardNoteStyle = {
  marginTop: "8px",
  color: "#64748b",
  fontWeight: 600
};

const insightGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px"
};

const panelStyle = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.14)",
  padding: "18px",
  display: "grid",
  gap: "16px"
};

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px"
};

const eyebrowStyle = {
  margin: 0,
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase"
};

const panelTitleStyle = {
  margin: "6px 0 0",
  color: "#0f172a",
  fontSize: "20px"
};

const metricStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px"
};

const miniMetricStyle = {
  padding: "12px",
  borderRadius: "12px",
  background: "#f8fafc",
  border: "1px solid #e5edf5",
  display: "grid",
  gap: "4px"
};

const listStyle = {
  display: "grid",
  gap: "10px"
};

const listItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #e5edf5",
  background: "#f8fafc"
};

const productRowStyle = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "center"
};

const productImageStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "10px",
  objectFit: "cover",
  background: "#fff"
};

const emptyStateStyle = {
  padding: "16px",
  borderRadius: "12px",
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  background: "#f8fafc"
};

const actionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "16px"
};

const actionCardStyle = {
  padding: "16px",
  borderRadius: "14px",
  border: "1px solid #dbe7f0",
  background: "#fff",
  color: "#334155",
  textDecoration: "none",
  display: "grid",
  gap: "6px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};
