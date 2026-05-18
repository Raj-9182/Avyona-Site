import React from "react";
import { fetchCreditSummary, fetchCreditTransactions, fetchCreditSettings, updateCreditSettings } from "../../api/adminApi";

export default function ReferralSystem() {
  const [summary, setSummary] = React.useState(null);
  const [transactions, setTransactions] = React.useState([]);
  const [settings, setSettings] = React.useState({ referrerBonusPoints: 300, refereeBonusPoints: 500 });
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetchCreditSummary(),
      fetchCreditTransactions({ type: "referral_bonus", limit: 50 }),
      fetchCreditSettings()
    ])
      .then(([summaryRes, txRes, settingsRes]) => {
        setSummary(summaryRes.data?.data || null);
        setTransactions(txRes.data?.data || []);
        setSettings(settingsRes.data?.data || {});
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load referral system."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const saveBonuses = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const res = await updateCreditSettings({
        referrerBonusPoints: Number(settings.referrerBonusPoints || 0),
        refereeBonusPoints: Number(settings.refereeBonusPoints || 0)
      });
      setSettings(res.data?.data || settings);
      setMessage("Referral bonuses saved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save referral bonuses.");
    }
  };

  const referral = summary?.referral || {};

  return (
    <div style={wrapStyle}>
      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={statGridStyle}>
        <Stat label="Referral Codes" value={Number(referral.totalCodes || 0).toLocaleString()} />
        <Stat label="Total Referrals" value={Number(referral.totalReferrals || 0).toLocaleString()} />
        <Stat label="Successful" value={Number(referral.successfulReferrals || 0).toLocaleString()} />
        <Stat label="Pending" value={Number(referral.pendingReferrals || 0).toLocaleString()} />
        <Stat label="Blocked" value={Number(referral.blockedReferrals || 0).toLocaleString()} />
        <Stat label="Points Earned" value={`${Number(referral.totalPointsFromReferrals || 0).toLocaleString()} pts`} />
      </div>

      <form style={panelStyle} onSubmit={saveBonuses}>
        <div style={toolbarStyle}>
          <div>
            <span style={eyebrowStyle}>Referral Settings</span>
            <h3 style={titleStyle}>Bonus Configuration</h3>
          </div>
          <button type="button" style={secondaryBtnStyle} onClick={loadData}>Refresh</button>
        </div>
        <div style={formGridStyle}>
          <label style={fieldStyle}>Referrer Bonus Points<input style={inputStyle} type="number" min="0" value={settings.referrerBonusPoints ?? ""} onChange={(e) => setSettings({ ...settings, referrerBonusPoints: e.target.value })} /></label>
          <label style={fieldStyle}>Referee Bonus Points<input style={inputStyle} type="number" min="0" value={settings.refereeBonusPoints ?? ""} onChange={(e) => setSettings({ ...settings, refereeBonusPoints: e.target.value })} /></label>
        </div>
        <button type="submit" style={primaryBtnStyle}>Save Referral Settings</button>
      </form>

      <div style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <span style={eyebrowStyle}>Referral Rewards</span>
            <h3 style={titleStyle}>Recent Referral Transactions</h3>
          </div>
        </div>
        {loading ? <p style={mutedStyle}>Loading referral rewards...</p> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Customer</th><th style={thStyle}>Points</th><th style={thStyle}>Reference</th><th style={thStyle}>Date</th></tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={tdStyle}><strong>{tx.customerName}</strong><br /><span style={mutedStyle}>{tx.customerEmail}</span></td>
                    <td style={tdStyle}>+{Number(tx.points).toLocaleString()} pts</td>
                    <td style={tdStyle}>{tx.referenceType || "-"} {tx.referenceId || ""}</td>
                    <td style={tdStyle}>{tx.date ? new Date(tx.date).toLocaleString("en-IN") : "-"}</td>
                  </tr>
                ))}
                {!transactions.length && <tr><td style={tdStyle} colSpan={4}>No referral transactions found.</td></tr>}
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
const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 };
const fieldStyle = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const inputStyle = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const primaryBtnStyle = { minHeight: 42, border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", padding: "0 18px", fontWeight: 800, cursor: "pointer" };
const secondaryBtnStyle = { minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const tableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 680 };
const thStyle = { padding: 12, textAlign: "left", color: "#334155", fontSize: 12, textTransform: "uppercase", background: "#f8fafc" };
const tdStyle = { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a" };
const mutedStyle = { color: "#64748b", fontSize: 12, margin: 0 };
const successStyle = { padding: 12, borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
