import React from "react";
import { adminApi } from "../../api/adminApi";

function StatCard({ label, value, sub, accent, bg, border }) {
  return (
    <div style={{ display: "grid", gap: "4px", padding: "16px", border: `1px solid ${border}`, borderRadius: "14px", background: bg }}>
      <span style={{ color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <strong style={{ color: accent, fontSize: "28px", lineHeight: 1 }}>{value}</strong>
      {sub && <span style={{ color: accent, fontSize: "12px", fontWeight: 700 }}>{sub}</span>}
    </div>
  );
}

function getInitials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function WalletSummary() {
  const [data, setData]       = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState("");

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi.get("/admin/credits/summary")
      .then((res) => { if (active) { setData(res.data?.data || null); setLoading(false); } })
      .catch((err) => { if (active) { setError(err?.response?.data?.message || "Failed to load summary"); setLoading(false); } });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Loading summary...</div>;
  }
  if (error) {
    return <div style={{ padding: "20px", color: "#dc2626", fontSize: "14px" }}>{error}</div>;
  }
  if (!data) return null;

  const netCirculating = data.totalIssued - data.totalRedeemed - data.totalExpired;
  const redeemRate     = data.totalIssued > 0 ? ((data.totalRedeemed / data.totalIssued) * 100).toFixed(1) : "0.0";
  const expireRate     = data.totalIssued > 0 ? ((data.totalExpired  / data.totalIssued) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ display: "grid", gap: "24px" }}>

      {/* ── Top stat cards ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" }}>
        <StatCard label="Total Issued"       value={data.totalIssued.toLocaleString()}       sub="all time"                accent="#1d4ed8" bg="#eff6ff"  border="#bfdbfe" />
        <StatCard label="Total Redeemed"     value={data.totalRedeemed.toLocaleString()}     sub={`${redeemRate}% of issued`} accent="#7c3aed" bg="#fdf4ff"  border="#e9d5ff" />
        <StatCard label="Total Expired"      value={data.totalExpired.toLocaleString()}      sub={`${expireRate}% of issued`} accent="#b45309" bg="#fff7ed"  border="#fed7aa" />
        <StatCard label="Active Points"      value={data.totalActivePoints.toLocaleString()} sub="in wallets now"           accent="#166534" bg="#f0fdf4"  border="#bbf7d0" />
        <StatCard label="Active Users"       value={data.activeUsers.toLocaleString()}       sub="with available pts"      accent="#0891b2" bg="#ecfeff"  border="#a5f3fc" />
        <StatCard label="Blocked Wallets"    value={data.blockedWallets.toLocaleString()}    sub="requires review"         accent="#dc2626" bg="#fff1f2"  border="#fca5a5" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* ── Top reward customers ───────────────────────────────────────── */}
        <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#ffffff" }}>
          <p style={{ margin: "0 0 16px", color: "#334155", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Top Reward Customers
          </p>
          {data.topCustomers.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>No wallet data yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {data.topCustomers.map((c, i) => (
                <div key={c.customerId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ display: "grid", placeItems: "center", width: "32px", height: "32px", borderRadius: "50%", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: 800, flexShrink: 0 }}>
                    {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`}
                  </span>
                  <div style={{ display: "grid", placeItems: "center", width: "36px", height: "36px", borderRadius: "50%", background: "#f1f5f9", color: "#475569", fontSize: "13px", fontWeight: 800, flexShrink: 0 }}>
                    {getInitials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: "block", color: "#0f172a", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</strong>
                    <span style={{ color: "#94a3b8", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.email}</span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <strong style={{ display: "block", color: "#166534", fontSize: "14px" }}>{Number(c.totalPoints).toLocaleString()} pts</strong>
                    <span style={{ color: "#64748b", fontSize: "11px" }}>{Number(c.availablePoints).toLocaleString()} avail.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Referral Stats ─────────────────────────────────────────────── */}
        <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#ffffff" }}>
          <p style={{ margin: "0 0 16px", color: "#334155", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Referral Stats
          </p>
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Referral Codes Active",  value: data.referral.totalCodes.toLocaleString(),               accent: "#1d4ed8" },
              { label: "Total Referrals",        value: data.referral.totalReferrals.toLocaleString(),           accent: "#7c3aed" },
              { label: "Successful Referrals",   value: data.referral.successfulReferrals.toLocaleString(),      accent: "#166534" },
              { label: "Points via Referrals",   value: data.referral.totalPointsFromReferrals.toLocaleString(), accent: "#b45309" }
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", border: "1px solid #f1f5f9", borderRadius: "10px", background: "#f8fafc" }}>
                <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600 }}>{row.label}</span>
                <strong style={{ color: row.accent, fontSize: "16px" }}>{row.value}</strong>
              </div>
            ))}
          </div>

          {/* Conversion health bar */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>Referral Success Rate</span>
              <span style={{ color: "#166534", fontSize: "12px", fontWeight: 800 }}>
                {data.referral.totalReferrals > 0
                  ? `${((data.referral.successfulReferrals / data.referral.totalReferrals) * 100).toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <div style={{ height: "6px", borderRadius: "99px", background: "#f1f5f9", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: "99px", background: "linear-gradient(90deg, #166534, #4ade80)",
                width: data.referral.totalReferrals > 0
                  ? `${Math.min(100, (data.referral.successfulReferrals / data.referral.totalReferrals) * 100).toFixed(1)}%`
                  : "0%"
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Points health bar ────────────────────────────────────────────── */}
      <div style={{ padding: "20px", border: "1px solid #e2e8f0", borderRadius: "16px", background: "#ffffff" }}>
        <p style={{ margin: "0 0 16px", color: "#334155", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Points Distribution
        </p>
        <div style={{ display: "flex", height: "12px", borderRadius: "99px", overflow: "hidden", gap: "2px" }}>
          {[
            { pct: data.totalIssued > 0 ? (netCirculating   / data.totalIssued) * 100 : 0, color: "#22c55e", label: "Circulating" },
            { pct: data.totalIssued > 0 ? (data.totalRedeemed / data.totalIssued) * 100 : 0, color: "#a855f7", label: "Redeemed"   },
            { pct: data.totalIssued > 0 ? (data.totalExpired  / data.totalIssued) * 100 : 0, color: "#f59e0b", label: "Expired"    }
          ].map((seg) => (
            seg.pct > 0 && <div key={seg.label} style={{ height: "100%", width: `${seg.pct.toFixed(1)}%`, background: seg.color, transition: "width 0.4s ease" }} title={`${seg.label}: ${seg.pct.toFixed(1)}%`} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "10px", flexWrap: "wrap" }}>
          {[
            { label: "Circulating", color: "#22c55e", value: `${netCirculating < 0 ? 0 : netCirculating}` },
            { label: "Redeemed",    color: "#a855f7", value: String(data.totalRedeemed) },
            { label: "Expired",     color: "#f59e0b", value: String(data.totalExpired)  }
          ].map((leg) => (
            <div key={leg.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: leg.color, flexShrink: 0 }} />
              <span style={{ color: "#64748b", fontSize: "12px" }}>{leg.label}</span>
              <strong style={{ color: "#0f172a", fontSize: "12px" }}>{Number(leg.value).toLocaleString()} pts</strong>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
