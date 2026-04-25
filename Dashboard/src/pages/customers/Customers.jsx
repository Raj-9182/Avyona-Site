import React from "react";
import { Link } from "react-router-dom";
import { fetchCustomers } from "../../api/customerApi";
import { formatCurrency } from "../../utils/storefront";
import fallbackCustomers from "../../data/customers";

function formatDate(value) {
  if (!value) return "No orders yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatStatusLabel(value) {
  return String(value || "")
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getAccountStatusStyle(status) {
  if (status === "active") return { background: "#dcfce7", color: "#15803d" };
  if (status === "inactive") return { background: "#e5e7eb", color: "#4b5563" };
  if (status === "blocked") return { background: "#fee2e2", color: "#dc2626" };
  return { background: "#e2e8f0", color: "#475569" };
}

function normalizeCustomer(customer) {
  return {
    id: customer.id,
    fullName: customer.fullName || customer.name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    totalOrders: Number(customer.totalOrders || customer.orders || 0),
    totalSpend: Number(customer.totalSpend || customer.spent || 0),
    lastOrderDate: customer.lastOrderDate || "",
    accountStatus: customer.accountStatus || customer.status || "inactive",
    city: customer.city || "",
    state: customer.state || "",
    createdAt: customer.createdAt || customer.lastOrderDate || ""
  };
}

export default function Customers() {
  const [customers, setCustomers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [spendSort, setSpendSort] = React.useState("highest");
  const [latestSort, setLatestSort] = React.useState("newest");

  React.useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetchCustomers();
        const backendCustomers = (response.data?.data || []).map(normalizeCustomer);

        if (!isMounted) return;

        setCustomers(backendCustomers.length ? backendCustomers : fallbackCustomers.map(normalizeCustomer));
      } catch (error) {
        if (!isMounted) return;

        setCustomers(fallbackCustomers.map(normalizeCustomer));
        setErrorMessage(error.response?.data?.message || "Backend customers are unavailable right now. Showing demo customers.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  const statusOptions = React.useMemo(
    () => ["all", ...new Set(customers.map((customer) => customer.accountStatus || "inactive"))],
    [customers]
  );

  const filteredCustomers = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return customers
      .filter((customer) => {
        const matchesSearch = !query || [
          customer.id,
          customer.fullName,
          customer.email,
          customer.phone,
          customer.city,
          customer.state
        ].some((value) => String(value || "").toLowerCase().includes(query));

        const matchesStatus = statusFilter === "all" || customer.accountStatus === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((firstCustomer, secondCustomer) => {
        const spendDifference = Number(secondCustomer.totalSpend || 0) - Number(firstCustomer.totalSpend || 0);

        if (spendSort === "lowest") {
          if (spendDifference !== 0) {
            return -spendDifference;
          }
        } else if (spendDifference !== 0) {
          return spendDifference;
        }

        const firstLatestTime = new Date(firstCustomer.createdAt || 0).getTime();
        const secondLatestTime = new Date(secondCustomer.createdAt || 0).getTime();
        const latestDifference = secondLatestTime - firstLatestTime;

        if (latestSort === "oldest") {
          return -latestDifference;
        }

        return latestDifference;
      });
  }, [customers, latestSort, searchTerm, spendSort, statusFilter]);

  const totalSpend = filteredCustomers.reduce((sum, customer) => sum + Number(customer.totalSpend || 0), 0);
  const totalOrders = filteredCustomers.reduce((sum, customer) => sum + Number(customer.totalOrders || 0), 0);

  const handleToggleBlocked = (customerId) => {
    setCustomers((currentCustomers) => currentCustomers.map((customer) => {
      if (String(customer.id) !== String(customerId)) {
        return customer;
      }

      return {
        ...customer,
        accountStatus: customer.accountStatus === "blocked" ? "active" : "blocked"
      };
    }));
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>Customers</h2>
          <p style={{ margin: "8px 0 0", color: "#698096" }}>
            Control the customer list, profile details, spend, order activity, saved addresses, and notes from one module.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span style={summaryPillStyle}>{`Customers: ${customers.length}`}</span>
          <span style={summaryPillStyle}>{`Orders: ${totalOrders}`}</span>
          <span style={summaryPillStyle}>{`Spend: ${formatCurrency(totalSpend)}`}</span>
        </div>
      </div>

      <section style={toolbarCardStyle}>
        <div style={toolbarGridStyle}>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by customer ID, name, email, phone, city, or state"
            style={filterInputStyle}
          />

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={filterInputStyle}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All Account Status" : formatStatusLabel(status)}
              </option>
            ))}
          </select>

          <select value={spendSort} onChange={(event) => setSpendSort(event.target.value)} style={filterInputStyle}>
            <option value="highest">Sort by Total Spend: Highest First</option>
            <option value="lowest">Sort by Total Spend: Lowest First</option>
          </select>

          <select value={latestSort} onChange={(event) => setLatestSort(event.target.value)} style={filterInputStyle}>
            <option value="newest">Sort by Latest Customer: Newest First</option>
            <option value="oldest">Sort by Latest Customer: Oldest First</option>
          </select>
        </div>
      </section>

      {errorMessage ? (
        <div style={previewNoticeStyle}>
          {errorMessage}
        </div>
      ) : null}

      <div style={tableCardStyle}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: "1080px" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={tableHeaderStyle}>Customer ID</th>
              <th style={tableHeaderStyle}>Customer Name</th>
              <th style={tableHeaderStyle}>Email</th>
              <th style={tableHeaderStyle}>Phone</th>
              <th style={tableHeaderStyle}>Total Orders</th>
              <th style={tableHeaderStyle}>Total Spend</th>
              <th style={tableHeaderStyle}>Last Order Date</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" style={{ ...tableCellStyle, textAlign: "center", color: "#64748b", padding: "28px 16px" }}>
                  Loading customers...
                </td>
              </tr>
            ) : null}

            {!isLoading && filteredCustomers.map((customer) => (
              <tr key={customer.id} style={tableRowStyle}>
                <td style={tableCellStyle}>
                  <strong>{customer.id}</strong>
                </td>
                <td style={tableCellStyle}>
                  <strong>{customer.fullName}</strong>
                </td>
                <td style={tableCellStyle}>
                  {customer.email || "Not available"}
                </td>
                <td style={tableCellStyle}>
                  {customer.phone || "Not available"}
                </td>
                <td style={tableCellStyle}>
                  <strong>{Number(customer.totalOrders || 0)}</strong>
                </td>
                <td style={tableCellStyle}>
                  <strong>{formatCurrency(Number(customer.totalSpend || 0))}</strong>
                </td>
                <td style={tableCellStyle}>{formatDate(customer.lastOrderDate)}</td>
                <td style={tableCellStyle}>
                  <span style={{ ...pillBaseStyle, ...getAccountStatusStyle(customer.accountStatus) }}>
                    {formatStatusLabel(customer.accountStatus)}
                  </span>
                </td>
                <td style={tableCellStyle}>
                  <div style={actionGroupStyle}>
                    <Link to={`/dashboard/customers/${customer.id}`} style={actionLinkStyle}>
                      View
                    </Link>
                    <button
                      type="button"
                      style={customer.accountStatus === "blocked" ? secondaryActionButtonStyle : dangerActionButtonStyle}
                      onClick={() => handleToggleBlocked(customer.id)}
                    >
                      {customer.accountStatus === "blocked" ? "Unblock" : "Block"}
                    </button>
                    <Link to="/dashboard/orders" style={secondaryActionLinkStyle}>
                      View Orders
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {!isLoading && !filteredCustomers.length ? (
              <tr>
                <td colSpan="9" style={{ ...tableCellStyle, textAlign: "center", color: "#64748b", padding: "28px 16px" }}>
                  No customers matched the current search and filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap"
};

const toolbarGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1.5fr) repeat(3, minmax(180px, 240px))",
  gap: "16px"
};

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

const previewNoticeStyle = {
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#c2410c",
  fontWeight: 600
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

const secondaryActionButtonStyle = {
  minHeight: "30px",
  padding: "0 12px",
  borderRadius: "9px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer"
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

const mutedTextStyle = {
  color: "#8aa0b5",
  fontSize: "12px"
};
