import React from "react";
import { Link } from "react-router-dom";
import orders from "../../data/orders";
import { fetchOrders } from "../../api/adminApi";
import { formatCurrency } from "../../utils/storefront";
import { formatOrderStatusLabel } from "../../../../shared/orderStatusFlow";

function formatOrderDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getOrderStatusStyle(status) {
  if (status === "pending") return { background: "#fef3c7", color: "#9a6700" };
  if (status === "confirmed") return { background: "#dbeafe", color: "#2563eb" };
  if (status === "packed") return { background: "#f3e8ff", color: "#9333ea" };
  if (status === "shipped") return { background: "#e0e7ff", color: "#4f46e5" };
  if (status === "out_for_delivery") return { background: "#ccfbf1", color: "#0f766e" };
  if (status === "delivered") return { background: "#dcfce7", color: "#16a34a" };
  if (status === "cancelled") return { background: "#fee2e2", color: "#ef4444" };
  if (status === "returned") return { background: "#e5e7eb", color: "#6b7280" };
  return { background: "#f8fafc", color: "#475569" };
}

function getPaymentStatusStyle(status) {
  const normalizedStatus = getPaymentBadgeLabel(status);

  if (normalizedStatus === "Paid") return { background: "#dcfce7", color: "#16a34a" };
  if (normalizedStatus === "Unpaid") return { background: "#fee2e2", color: "#ef4444" };
  if (normalizedStatus === "Partial") return { background: "#ffedd5", color: "#ea580c" };
  if (normalizedStatus === "Refunded") return { background: "#e5e7eb", color: "#6b7280" };
  return { background: "#f8fafc", color: "#475569" };
}

function getPaymentBadgeLabel(status) {
  if (status === "paid" || status === "authorized") return "Paid";
  if (status === "partially-refunded") return "Partial";
  if (status === "refunded") return "Refunded";
  if (status === "pending" || status === "failed" || status === "cod-pending" || status === "cod_pending") return "Unpaid";
  return status;
}

function normalizeOrderRow(order) {
  const placedAt = order.createdAt || order.placedAt || new Date().toISOString();
  const totalAmount = Number(order.totalAmount ?? order.pricing?.grandTotal ?? 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    placedAt,
    orderStatus: order.status || order.orderStatus || "pending",
    paymentStatus: order.paymentStatus || "pending",
    customer: {
      fullName: order.customerName || order.customer?.fullName || "Guest Customer",
      email: order.customerEmail || order.customer?.email || "",
      phone: order.customerPhone || order.customer?.phone || ""
    },
    pricing: {
      grandTotal: totalAmount
    },
    payment: {
      method: order.paymentMethod || order.payment?.method || "Not selected"
    },
    products: Array.from({ length: Math.max(1, Number(order.itemCount || order.products?.length || 1)) }, (_, index) => ({ id: index }))
  };
}

export default function Orders() {
  const [orderRows, setOrderRows] = React.useState(() => orders);
  const [sourceMessage, setSourceMessage] = React.useState("Showing local order preview.");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const orderStatuses = React.useMemo(
    () => ["all", ...new Set(orderRows.map((order) => order.orderStatus))],
    [orderRows]
  );
  const paymentStatuses = React.useMemo(
    () => ["all", ...new Set(orderRows.map((order) => order.paymentStatus))],
    [orderRows]
  );

  const filteredOrders = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orderRows.filter((order) => {
      const orderDate = new Date(order.placedAt);
      const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

      const matchesSearch = !query || [
        order.orderNumber,
        order.customer.fullName,
        order.customer.email,
        order.customer.phone
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesOrderStatus = orderStatusFilter === "all" || order.orderStatus === orderStatusFilter;
      const matchesPaymentStatus = paymentStatusFilter === "all" || order.paymentStatus === paymentStatusFilter;
      const matchesDateFrom = !fromDate || orderDate >= fromDate;
      const matchesDateTo = !toDate || orderDate <= toDate;

      return matchesSearch && matchesOrderStatus && matchesPaymentStatus && matchesDateFrom && matchesDateTo;
    });
  }, [dateFrom, dateTo, orderRows, orderStatusFilter, paymentStatusFilter, searchTerm]);

  const handleDeleteOrder = (orderId) => {
    const shouldDelete = window.confirm("Delete this order from the local admin table?");

    if (!shouldDelete) return;

    setOrderRows((currentOrders) => currentOrders.filter((order) => order.id !== orderId));
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      try {
        const response = await fetchOrders();
        if (!isMounted) return;

        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        if (rows.length) {
          setOrderRows(rows.map(normalizeOrderRow));
          setSourceMessage("Orders loaded from backend.");
          return;
        }

        setSourceMessage("Backend returned no orders, so local order preview is shown.");
      } catch {
        if (!isMounted) return;
        setOrderRows(orders);
        setSourceMessage("Backend orders require admin login and database access, so local order preview is shown.");
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setOrderStatusFilter("all");
    setPaymentStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Orders</h2>
          <p style={{ margin: "8px 0 0", color: "#698096" }}>
            See all orders in one management table with customer, payment, status, and date visibility.
          </p>
          <p style={{ margin: "6px 0 0", color: "#0f766e", fontSize: "13px", fontWeight: 700 }}>
            {sourceMessage}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span style={summaryPillStyle}>{`All Orders: ${orderRows.length}`}</span>
          <span style={summaryPillStyle}>{`Visible Orders: ${filteredOrders.length}`}</span>
        </div>
      </div>

      <section style={toolbarCardStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 1.5fr) repeat(4, minmax(160px, 1fr)) auto",
            gap: "16px"
          }}
        >
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by order ID, customer, email, or phone"
            style={filterInputStyle}
          />

          <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} style={filterInputStyle}>
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All Order Status" : formatOrderStatusLabel(status)}
              </option>
            ))}
          </select>

          <select value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} style={filterInputStyle}>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All Payment Status" : status}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            style={filterInputStyle}
            aria-label="Filter orders from date"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            style={filterInputStyle}
            aria-label="Filter orders to date"
          />

          <button type="button" onClick={resetFilters} style={secondaryButtonStyle}>
            Reset
          </button>
        </div>
      </section>

      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "1280px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={tableHeaderStyle}>Order ID</th>
              <th style={tableHeaderStyle}>Customer Name</th>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Total Amount</th>
              <th style={tableHeaderStyle}>Payment Method</th>
              <th style={tableHeaderStyle}>Payment Status</th>
              <th style={tableHeaderStyle}>Order Status</th>
              <th style={tableHeaderStyle}>Items Count</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} style={tableRowStyle}>
                <td style={tableCellStyle}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <strong>{order.orderNumber}</strong>
                    <span style={mutedTextStyle}>{`Internal ID: ${order.id}`}</span>
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <strong>{order.customer.fullName}</strong>
                    <span style={mutedTextStyle}>{order.customer.email}</span>
                    <span style={mutedTextStyle}>{order.customer.phone}</span>
                  </div>
                </td>
                <td style={tableCellStyle}>{formatOrderDate(order.placedAt)}</td>
                <td style={tableCellStyle}>
                  <strong>{formatCurrency(order.pricing.grandTotal)}</strong>
                </td>
                <td style={tableCellStyle}>{order.payment.method}</td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      ...pillBaseStyle,
                      ...getPaymentStatusStyle(order.paymentStatus)
                    }}
                  >
                    {getPaymentBadgeLabel(order.paymentStatus)}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <span
                    style={{
                      ...pillBaseStyle,
                      ...getOrderStatusStyle(order.orderStatus)
                    }}
                  >
                    {formatOrderStatusLabel(order.orderStatus)}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <strong>{order.products.length}</strong>
                </td>
                <td style={tableCellStyle}>
                  <div style={actionGroupStyle}>
                    <Link to={`/dashboard/orders/${order.id}`} style={actionLinkStyle}>
                      View
                    </Link>
                    <Link to={`/dashboard/orders/${order.id}`} style={secondaryActionLinkStyle}>
                      Edit Status
                    </Link>
                    <button type="button" style={mutedActionButtonStyle} disabled title="Invoice and packing slip printing is not available in this dashboard preview yet.">
                      Print
                    </button>
                    <button
                      type="button"
                      style={dangerActionButtonStyle}
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredOrders.length ? (
              <tr>
                <td colSpan="9" style={{ ...tableCellStyle, textAlign: "center", color: "#64748b", padding: "28px 16px" }}>
                  No orders matched the current search and filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const toolbarCardStyle = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  padding: "14px"
};

const tableCardStyle = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  overflowX: "auto"
};

const tableHeaderStyle = {
  padding: "14px 16px 15px",
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: "13px",
  fontWeight: 700,
  background: "#f8fafc",
  whiteSpace: "nowrap"
};

const tableRowStyle = {
  background: "#ffffff"
};

const tableCellStyle = {
  padding: "14px 16px",
  borderBottom: "1px solid #eef2f7",
  color: "#0f172a",
  verticalAlign: "top"
};

const filterInputStyle = {
  width: "100%",
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #d4dbe6",
  background: "#fff",
  boxSizing: "border-box",
  color: "#0f172a",
  fontSize: "14px"
};

const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #edf2f7",
  color: "#475569",
  fontWeight: 700,
  fontSize: "12px",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)"
};

const pillBaseStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "28px",
  padding: "0 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: "nowrap"
};

const actionLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "30px",
  padding: "0 14px",
  borderRadius: "9px",
  background: "#0f172a",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "13px",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.18)"
};

const secondaryActionLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "9px",
  border: "1px solid #d4dbe6",
  background: "#fff",
  color: "#334155",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "12px"
};

const mutedActionButtonStyle = {
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "9px",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#94a3b8",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "not-allowed"
};

const dangerActionButtonStyle = {
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "9px",
  border: "1px solid #fecaca",
  background: "#fff5f5",
  color: "#dc2626",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer"
};

const actionGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap"
};

const secondaryButtonStyle = {
  minHeight: "36px",
  padding: "0 16px",
  borderRadius: "10px",
  border: "1px solid #d4dbe6",
  background: "#fff",
  color: "#334155",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "14px"
};

const mutedTextStyle = {
  color: "#8aa0b5",
  fontSize: "12px"
};
