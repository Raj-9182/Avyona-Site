import React from "react";
import { fetchUpcomingCreditExpirations, runCreditExpiryJob } from "../../api/adminApi";

export default function ExpirySystem() {
  const [rows, setRows] = React.useState([]);
  const [days, setDays] = React.useState(30);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");

  const loadUpcoming = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetchUpcomingCreditExpirations({ days })
      .then((res) => setRows(res.data?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load upcoming expirations."))
      .finally(() => setLoading(false));
  }, [days]);

  React.useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  const runNow = async () => {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await runCreditExpiryJob();
      setResult(res.data?.data || res.data || {});
      loadUpcoming();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to run expiry job.");
    } finally {
      setRunning(false);
    }
  };

  const totalPoints = rows.reduce((sum, row) => sum + Number(row.totalPoints || 0), 0);

  return (
    <div style={wrapStyle}>
      <div style={statGridStyle}>
        <Stat label="Upcoming Groups" value={rows.length} />
        <Stat label="Points At Risk" value={`${totalPoints.toLocaleString()} pts`} />
        <Stat label="Window" value={`${days} days`} />
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {result && <div style={successStyle}>Expiry job completed. Processed {Number(result.processed || 0).toLocaleString()} customer group(s), expired {Number(result.pointsExpired || 0).toLocaleString()} points.</div>}

      <div style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <span style={eyebrowStyle}>Points Expiry</span>
            <h3 style={titleStyle}>Upcoming Expirations</h3>
          </div>
          <div style={toolbarRightStyle}>
            <input style={inputStyle} type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
            <button type="button" style={secondaryBtnStyle} onClick={loadUpcoming}>Refresh</button>
            <button type="button" style={primaryBtnStyle} onClick={runNow} disabled={running}>{running ? "Running..." : "Run Expiry Now"}</button>
          </div>
        </div>

        {loading ? <p style={mutedStyle}>Loading expirations...</p> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Expiry Date</th><th style={thStyle}>Transactions</th><th style={thStyle}>Customers</th><th style={thStyle}>Total Points</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.expiryDate}>
                    <td style={tdStyle}>{row.expiryDate ? new Date(row.expiryDate).toLocaleDateString("en-IN") : "-"}</td>
                    <td style={tdStyle}>{Number(row.transactionCount || 0).toLocaleString()}</td>
                    <td style={tdStyle}>{Number(row.customerCount || 0).toLocaleString()}</td>
                    <td style={tdStyle}>{Number(row.totalPoints || 0).toLocaleString()} pts</td>
                  </tr>
                ))}
                {!rows.length && <tr><td style={tdStyle} colSpan={4}>No points expiring in this window.</td></tr>}
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

const wrapStyle = { display: "grid", gap: 16 };
const statGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const statStyle = { padding: 16, border: "1px solid #dbe5ef", borderRadius: 14, background: "#fff" };
const statValueStyle = { display: "block", marginTop: 4, fontSize: 22, color: "#0f172a" };
const panelStyle = { padding: 20, border: "1px solid #dbe5ef", borderRadius: 16, background: "#fff" };
const toolbarStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" };
const toolbarRightStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const inputStyle = { width: 100, minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const primaryBtnStyle = { minHeight: 40, border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", padding: "0 14px", fontWeight: 800, cursor: "pointer" };
const secondaryBtnStyle = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, background: "#fff", color: "#0f172a", padding: "0 14px", fontWeight: 800, cursor: "pointer" };
const tableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 620 };
const thStyle = { padding: 12, textAlign: "left", color: "#334155", fontSize: 12, textTransform: "uppercase", background: "#f8fafc" };
const tdStyle = { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a" };
const mutedStyle = { color: "#64748b", fontSize: 12, margin: 0 };
const successStyle = { padding: 12, borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
