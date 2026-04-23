import React, { useEffect, useState } from "react";
import { fetchDashboardSummary } from "../../../api/adminApi";
import { formatCurrency } from "../../../../Frontend/utils/storefront";

function getFallbackMetrics(context, allProducts) {
  const totalRevenue = (context.orders || []).reduce((sum, order) => sum + Number(order.total || 0), 0);

  return {
    products: allProducts.length,
    orders: (context.orders || []).length,
    customers: (context.accounts || []).length,
    revenue: totalRevenue
  };
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
    { title: "Total Products", value: metrics.products },
    { title: "Total Orders", value: metrics.orders },
    { title: "Customers", value: metrics.customers },
    { title: "Revenue", value: formatCurrency(metrics.revenue) }
  ];

  return (
    <div>
      <h2>Dashboard Overview</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "20px",
          marginTop: "20px"
        }}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
            }}
          >
            <h4>{card.title}</h4>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
