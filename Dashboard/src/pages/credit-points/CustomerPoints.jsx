import React from "react";
import {
  adjustCreditWallet,
  fetchCreditWalletDetails,
  fetchCreditWallets,
  resetCreditWallet,
  updateCreditWalletBlocked
} from "../../api/adminApi";

export default function CustomerPoints() {
  const [wallets, setWallets] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [active, setActive] = React.useState(null);
  const [walletDetail, setWalletDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [adjustForm, setAdjustForm] = React.useState({ points: "", reason: "", expiryDays: 365 });

  const loadWallets = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetchCreditWallets({ search, limit: 100 })
      .then((res) => setWallets(res.data?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load customer wallets."))
      .finally(() => setLoading(false));
  }, [search]);

  React.useEffect(() => {
    const timer = setTimeout(loadWallets, 250);
    return () => clearTimeout(timer);
  }, [loadWallets]);

  const runAction = async (action, success) => {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(success);
      setActive(null);
      setWalletDetail(null);
      loadWallets();
    } catch (err) {
      setError(err?.response?.data?.message || "Action failed.");
    }
  };

  const submitAdjustment = (event) => {
    event.preventDefault();
    if (!active) return;
    runAction(
      () => adjustCreditWallet(active.customerId, {
        points: Number(adjustForm.points),
        reason: adjustForm.reason,
        expiryDays: Number(adjustForm.expiryDays || 365)
      }),
      "Wallet adjusted successfully."
    );
  };

  const viewWallet = async (wallet) => {
    setError("");
    setMessage("");
    setDetailLoading(true);
    try {
      const res = await fetchCreditWalletDetails(wallet.customerId);
      setWalletDetail(res.data?.data || null);
      setActive(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load wallet details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const totalAvailable = wallets.reduce((sum, row) => sum + Number(row.availablePoints || 0), 0);
  const totalIssued = wallets.reduce((sum, row) => sum + Number(row.totalPoints || 0), 0);
  const totalCashback = wallets.reduce((sum, row) => sum + Number(row.totalCashbackEarned || 0), 0);
  const blocked = wallets.filter((row) => row.isBlocked).length;

  return (
    <div style={wrapStyle}>
      <div style={statGridStyle}>
        <Stat label="Wallets" value={wallets.length} />
        <Stat label="Total Issued" value={`${totalIssued.toLocaleString()} pts`} />
        <Stat label="Available" value={`${totalAvailable.toLocaleString()} pts`} />
        <Stat label="Cashback Earned" value={formatMoney(totalCashback)} />
        <Stat label="Blocked" value={blocked} />
      </div>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={panelStyle}>
        <div style={toolbarStyle}>
          <div>
            <span style={eyebrowStyle}>Customer Wallets</span>
            <h3 style={titleStyle}>Points Management</h3>
          </div>
          <div style={toolbarRightStyle}>
            <input style={inputStyle} placeholder="Search customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button type="button" style={secondaryBtnStyle} onClick={loadWallets}>Refresh</button>
          </div>
        </div>

        {loading ? <p style={mutedStyle}>Loading wallets...</p> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Customer</th><th style={thStyle}>Total Points</th><th style={thStyle}>Available</th><th style={thStyle}>Used</th><th style={thStyle}>Expired</th><th style={thStyle}>Cashback</th><th style={thStyle}>Orders</th><th style={thStyle}>Last Activity</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.customerId}>
                    <td style={tdStyle}><strong>{wallet.customerName}</strong><br /><span style={mutedStyle}>{wallet.customerEmail}</span></td>
                    <td style={tdStyle}>{Number(wallet.totalPoints || 0).toLocaleString()} pts</td>
                    <td style={tdStyle}>{Number(wallet.availablePoints).toLocaleString()} pts</td>
                    <td style={tdStyle}>{Number(wallet.usedPoints).toLocaleString()} pts<br /><span style={mutedStyle}>{formatMoney(wallet.totalRedeemedValue)}</span></td>
                    <td style={tdStyle}>{Number(wallet.expiredPoints).toLocaleString()} pts<br /><span style={mutedStyle}>{formatMoney(wallet.totalExpiredValue)}</span></td>
                    <td style={tdStyle}>{formatMoney(wallet.totalCashbackEarned)}</td>
                    <td style={tdStyle}>{Number(wallet.totalOrders || 0).toLocaleString()}</td>
                    <td style={tdStyle}>{formatDateTime(wallet.lastActivity)}</td>
                    <td style={tdStyle}><span style={wallet.isBlocked ? blockedPillStyle : activePillStyle}>{wallet.isBlocked ? "Blocked" : "Active"}</span></td>
                    <td style={tdStyle}>
                      <div style={actionsStyle}>
                        <button type="button" style={secondaryBtnStyle} onClick={() => viewWallet(wallet)}>{detailLoading ? "Loading" : "View Wallet"}</button>
                        <button type="button" style={secondaryBtnStyle} onClick={() => { setActive(wallet); setWalletDetail(null); setAdjustForm({ points: "", reason: "", expiryDays: 365 }); }}>Adjust</button>
                        <button type="button" style={secondaryBtnStyle} onClick={() => runAction(() => updateCreditWalletBlocked(wallet.customerId, !wallet.isBlocked), wallet.isBlocked ? "Wallet unblocked." : "Wallet blocked.")}>{wallet.isBlocked ? "Unblock" : "Block"}</button>
                        <button type="button" style={dangerBtnStyle} onClick={() => window.confirm(`Reset ${wallet.customerName}'s wallet?`) && runAction(() => resetCreditWallet(wallet.customerId), "Wallet reset.")}>Reset</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!wallets.length && <tr><td style={tdStyle} colSpan={10}>No wallets found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {walletDetail && (
        <div style={panelStyle}>
          <div style={toolbarStyle}>
            <div>
              <span style={eyebrowStyle}>View Wallet</span>
              <h3 style={titleStyle}>{walletDetail.wallet.customerName}</h3>
              <p style={mutedStyle}>{walletDetail.wallet.customerEmail}</p>
            </div>
            <button type="button" style={secondaryBtnStyle} onClick={() => setWalletDetail(null)}>Close</button>
          </div>

          <div style={statGridStyle}>
            <Stat label="Total Points" value={`${Number(walletDetail.wallet.totalPoints || 0).toLocaleString()} pts`} />
            <Stat label="Available" value={`${Number(walletDetail.wallet.availablePoints || 0).toLocaleString()} pts`} />
            <Stat label="Used" value={`${Number(walletDetail.wallet.usedPoints || 0).toLocaleString()} pts`} />
            <Stat label="Expired" value={`${Number(walletDetail.wallet.expiredPoints || 0).toLocaleString()} pts`} />
            <Stat label="Cashback Earned" value={formatMoney(walletDetail.wallet.totalCashbackEarned)} />
            <Stat label="Redeemed Value" value={formatMoney(walletDetail.wallet.totalRedeemedValue)} />
            <Stat label="Expired Value" value={formatMoney(walletDetail.wallet.totalExpiredValue)} />
            <Stat label="Total Orders" value={Number(walletDetail.wallet.totalOrders || 0).toLocaleString()} />
          </div>

          <div style={detailGridStyle}>
            <section style={sectionStyle}>
              <span style={eyebrowStyle}>Transaction History</span>
              <div style={miniTableWrapStyle}>
                <table style={miniTableStyle}>
                  <thead><tr><th style={thStyle}>Type</th><th style={thStyle}>Points</th><th style={thStyle}>Value</th><th style={thStyle}>Status</th><th style={thStyle}>Date</th></tr></thead>
                  <tbody>
                    {walletDetail.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td style={tdStyle}>{tx.type}<br /><span style={mutedStyle}>{tx.note || "-"}</span></td>
                        <td style={tdStyle}>{Number(tx.points || 0).toLocaleString()} pts</td>
                        <td style={tdStyle}>{formatMoney(tx.cashbackValue)}</td>
                        <td style={tdStyle}>{tx.status}</td>
                        <td style={tdStyle}>{formatDateTime(tx.date)}</td>
                      </tr>
                    ))}
                    {!walletDetail.transactions.length && <tr><td style={tdStyle} colSpan={5}>No transactions found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={sectionStyle}>
              <span style={eyebrowStyle}>Referral Activity</span>
              {walletDetail.referral ? (
                <div style={infoGridStyle}>
                  <Info label="Referral Code" value={walletDetail.referral.referralCode || "-"} />
                  <Info label="Referred By" value={walletDetail.referral.referredByCode || "-"} />
                  <Info label="Total Referrals" value={Number(walletDetail.referral.totalReferrals || 0).toLocaleString()} />
                  <Info label="Successful" value={Number(walletDetail.referral.successfulReferrals || 0).toLocaleString()} />
                  <Info label="Points Earned" value={`${Number(walletDetail.referral.pointsEarned || 0).toLocaleString()} pts`} />
                </div>
              ) : <p style={mutedStyle}>No referral activity found.</p>}
            </section>

            <section style={sectionStyle}>
              <span style={eyebrowStyle}>Expiry Timeline</span>
              <div style={timelineStyle}>
                {walletDetail.expiryTimeline.map((item) => (
                  <div key={`${item.expiryDate}-${item.status}`} style={timelineItemStyle}>
                    <strong>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("en-IN") : "-"}</strong>
                    <span style={mutedStyle}>{Number(item.points || 0).toLocaleString()} pts - {formatMoney(item.value)} - {item.status}</span>
                  </div>
                ))}
                {!walletDetail.expiryTimeline.length && <p style={mutedStyle}>No upcoming or past expiry entries.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {active && (
        <form style={panelStyle} onSubmit={submitAdjustment}>
          <div style={toolbarStyle}>
            <div>
              <span style={eyebrowStyle}>Manual Adjustment</span>
              <h3 style={titleStyle}>{active.customerName}</h3>
            </div>
            <button type="button" style={secondaryBtnStyle} onClick={() => setActive(null)}>Close</button>
          </div>
          <div style={formGridStyle}>
            <label style={fieldStyle}>Points<input style={inputStyle} type="number" value={adjustForm.points} onChange={(e) => setAdjustForm({ ...adjustForm, points: e.target.value })} placeholder="Use negative to remove" required /></label>
            <label style={fieldStyle}>Reason<input style={inputStyle} value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} required /></label>
            <label style={fieldStyle}>Expiry Days<input style={inputStyle} type="number" min="1" value={adjustForm.expiryDays} onChange={(e) => setAdjustForm({ ...adjustForm, expiryDays: e.target.value })} /></label>
          </div>
          <button type="submit" style={primaryBtnStyle}>Apply Adjustment</button>
        </form>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return <div style={statStyle}><span style={mutedStyle}>{label}</span><strong style={statValueStyle}>{value}</strong></div>;
}

function Info({ label, value }) {
  return <div><span style={mutedStyle}>{label}</span><strong style={infoValueStyle}>{value}</strong></div>;
}

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const wrapStyle = { display: "grid", gap: 16 };
const statGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 };
const statStyle = { padding: 16, border: "1px solid #dbe5ef", borderRadius: 14, background: "#fff" };
const statValueStyle = { display: "block", marginTop: 4, fontSize: 24, color: "#0f172a" };
const panelStyle = { padding: 20, border: "1px solid #dbe5ef", borderRadius: 16, background: "#fff" };
const toolbarStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" };
const toolbarRightStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const inputStyle = { minHeight: 40, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const primaryBtnStyle = { minHeight: 42, border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", padding: "0 18px", fontWeight: 800, cursor: "pointer" };
const secondaryBtnStyle = { minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const dangerBtnStyle = { ...secondaryBtnStyle, color: "#dc2626", borderColor: "#fecaca", background: "#fff5f5" };
const tableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 1180 };
const miniTableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 760 };
const thStyle = { padding: 12, textAlign: "left", color: "#334155", fontSize: 12, textTransform: "uppercase", background: "#f8fafc" };
const tdStyle = { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "middle" };
const mutedStyle = { color: "#64748b", fontSize: 12, margin: 0 };
const actionsStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 14 };
const fieldStyle = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 };
const successStyle = { padding: 12, borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
const activePillStyle = { padding: "5px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 12 };
const blockedPillStyle = { ...activePillStyle, background: "#fee2e2", color: "#dc2626" };
const detailGridStyle = { display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, .8fr)", gap: 16, marginTop: 16 };
const sectionStyle = { display: "grid", alignContent: "start", gap: 10, borderTop: "1px solid #e2e8f0", paddingTop: 14 };
const miniTableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const infoGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 };
const infoValueStyle = { display: "block", marginTop: 3, color: "#0f172a" };
const timelineStyle = { display: "grid", gap: 8 };
const timelineItemStyle = { display: "grid", gap: 3, padding: 10, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" };
