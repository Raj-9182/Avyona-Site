import React from "react";
import { fetchCreditTransactions } from "../../api/adminApi";

const TYPES = ["", "signup_bonus", "referral_bonus", "purchase_cashback", "review_reward", "milestone_reward", "manual_adjustment", "redemption", "expiry"];
const STATUSES = ["", "active", "used", "expired", "pending"];
const QUICK_FILTERS = [
  { value: "", label: "All Transactions" },
  { value: "rewards", label: "Reward Types" },
  { value: "redeemed", label: "Redeemed" },
  { value: "expired", label: "Expired" },
  { value: "manual", label: "Manual Adjustment" }
];
const REWARD_TYPES = ["signup_bonus", "referral_bonus", "purchase_cashback", "review_reward", "milestone_reward"];

function label(value) {
  return String(value || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function TransactionsHistory() {
  const [rows, setRows] = React.useState([]);
  const [summary, setSummary] = React.useState({ totalEarned: 0, totalRedeemed: 0, netPoints: 0 });
  const [filters, setFilters] = React.useState({ search: "", quick: "", type: "", status: "" });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const requestFilters = React.useMemo(() => {
    const params = { search: filters.search, type: filters.type, status: filters.status };
    if (filters.quick === "redeemed") params.type = "redemption";
    if (filters.quick === "expired") {
      params.type = filters.type || "expiry";
      params.status = "expired";
    }
    if (filters.quick === "manual") params.type = "manual_adjustment";
    return params;
  }, [filters]);

  const loadTransactions = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetchCreditTransactions({ ...requestFilters, limit: 100 })
      .then((res) => {
        const data = res.data?.data || [];
        setRows(filters.quick === "rewards" ? data.filter((tx) => REWARD_TYPES.includes(tx.type)) : data);
        setSummary(res.data?.summary || { totalEarned: 0, totalRedeemed: 0, netPoints: 0 });
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load transactions."))
      .finally(() => setLoading(false));
  }, [filters.quick, requestFilters]);

  React.useEffect(() => {
    const timer = setTimeout(loadTransactions, 250);
    return () => clearTimeout(timer);
  }, [loadTransactions]);

  return (
    <div style={wrapStyle}>
      <div style={statGridStyle}>
        <Stat label="Earned" value={`+${Number(summary.totalEarned || 0).toLocaleString()} pts`} />
        <Stat label="Redeemed" value={`-${Number(summary.totalRedeemed || 0).toLocaleString()} pts`} />
        <Stat label="Net In Result" value={`${Number(summary.netPoints || 0).toLocaleString()} pts`} />
        <Stat label="Rows Loaded" value={rows.length} />
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <span style={eyebrowStyle}>Audit Trail</span>
            <h3 style={titleStyle}>Transactions History</h3>
          </div>
          <button type="button" style={secondaryBtnStyle} onClick={loadTransactions}>Refresh</button>
        </div>
        <div style={filterStyle}>
          <input style={inputStyle} placeholder="Search customer..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select style={inputStyle} value={filters.quick} onChange={(e) => setFilters({ ...filters, quick: e.target.value, type: "", status: "" })}>{QUICK_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <select style={inputStyle} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} disabled={["redeemed", "manual"].includes(filters.quick)}>{TYPES.map((item) => <option key={item} value={item}>{item ? label(item) : "All Types"}</option>)}</select>
          <select style={inputStyle} value={filters.quick === "expired" ? "expired" : filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} disabled={filters.quick === "expired"}>{STATUSES.map((item) => <option key={item} value={item}>{item ? label(item) : "All Statuses"}</option>)}</select>
        </div>

        {loading ? <p style={mutedStyle}>Loading transactions...</p> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Customer</th><th style={thStyle}>Type</th><th style={thStyle}>Points</th><th style={thStyle}>Cashback</th><th style={thStyle}>Status</th><th style={thStyle}>Expiry Date</th><th style={thStyle}>Reference</th><th style={thStyle}>Date</th></tr></thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td style={tdStyle}><strong>{tx.customerName}</strong><br /><span style={mutedStyle}>{tx.customerEmail}</span></td>
                    <td style={tdStyle}>{label(tx.type)}</td>
                    <td style={{ ...tdStyle, color: tx.points < 0 ? "#dc2626" : "#166534", fontWeight: 800 }}>{tx.points > 0 ? "+" : ""}{Number(tx.points).toLocaleString()} pts</td>
                    <td style={tdStyle}>Rs {Number(tx.cashbackValue || 0).toLocaleString()}</td>
                    <td style={tdStyle}><span style={tx.status === "expired" ? expiredPillStyle : pillStyle}>{label(tx.status)}</span></td>
                    <td style={tdStyle}>{formatDate(tx.expiryDate)}{tx.status === "expired" ? <><br /><span style={expiredTextStyle}>Expired</span></> : null}</td>
                    <td style={tdStyle}>{tx.referenceType || "-"} {tx.referenceId || ""}</td>
                    <td style={tdStyle}>{tx.date ? new Date(tx.date).toLocaleString("en-IN") : "-"}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td style={tdStyle} colSpan={8}>No transactions found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><span style={mutedStyle}>{label}</span><strong style={statValueStyle}>{value}</strong></div>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN");
}

const wrapStyle = { display: "grid", gap: 16 };
const statGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const statStyle = { padding: 16, border: "1px solid #dbe5ef", borderRadius: 14, background: "#fff" };
const statValueStyle = { display: "block", marginTop: 4, fontSize: 22, color: "#0f172a" };
const panelStyle = { padding: 20, border: "1px solid #dbe5ef", borderRadius: 16, background: "#fff" };
const toolbarStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" };
const filterStyle = { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const inputStyle = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const secondaryBtnStyle = { minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const tableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 1040 };
const thStyle = { padding: 12, textAlign: "left", color: "#334155", fontSize: 12, textTransform: "uppercase", background: "#f8fafc" };
const tdStyle = { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "middle" };
const mutedStyle = { color: "#64748b", fontSize: 12, margin: 0 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
const pillStyle = { padding: "5px 10px", borderRadius: 999, background: "#f1f5f9", color: "#334155", fontWeight: 800, fontSize: 12 };
const expiredPillStyle = { ...pillStyle, background: "#fee2e2", color: "#dc2626" };
const expiredTextStyle = { color: "#dc2626", fontSize: 12, fontWeight: 800 };
