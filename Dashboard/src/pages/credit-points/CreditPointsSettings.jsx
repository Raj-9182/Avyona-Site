import React from "react";
import { fetchCreditSettings, updateCreditSettings } from "../../api/adminApi";

const FIELDS = [
  ["pointsPerRupee", "Points per Rs 1"],
  ["minRedeemPoints", "Minimum Redeem Points"],
  ["maxRedeemPercent", "Max Redeem per Order (%)"],
  ["expiryDays", "Points Expiry Days"],
  ["expiryWarningDays", "Expiry Warning Days"],
  ["referrerBonusPoints", "Referrer Bonus Points"],
  ["refereeBonusPoints", "Referee Bonus Points"]
];

export default function CreditPointsSettings({ onSave }) {
  const [form, setForm] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  const loadSettings = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetchCreditSettings()
      .then((res) => {
        const data = res.data?.data || {};
        setForm(data);
        onSave?.(data);
      })
      .catch((err) => setError(err?.response?.data?.message || "Failed to load credit settings."))
      .finally(() => setLoading(false));
  }, [onSave]);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = Object.fromEntries(FIELDS.map(([key]) => [key, Number(form[key] || 0)]));
      const res = await updateCreditSettings(payload);
      const saved = res.data?.data || payload;
      setForm(saved);
      onSave?.(saved);
      setMessage("Credit settings saved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save credit settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={panelStyle}>Loading credit settings...</div>;

  return (
    <form style={panelStyle} onSubmit={submit}>
      <div style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>System Rules</span>
          <h3 style={titleStyle}>Credit Points Settings</h3>
        </div>
        <button type="button" style={secondaryBtnStyle} onClick={loadSettings}>Refresh</button>
      </div>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={gridStyle}>
        {FIELDS.map(([key, label]) => (
          <label key={key} style={fieldStyle}>
            {label}
            <input
              style={inputStyle}
              type="number"
              min={key === "maxRedeemPercent" ? 1 : 0}
              max={key === "maxRedeemPercent" ? 100 : undefined}
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key !== "referrerBonusPoints" && key !== "refereeBonusPoints"}
            />
          </label>
        ))}
      </div>
      <button type="submit" style={primaryBtnStyle} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
    </form>
  );
}

const panelStyle = { padding: 20, border: "1px solid #dbe5ef", borderRadius: 16, background: "#fff", display: "grid", gap: 14 };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const fieldStyle = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 };
const inputStyle = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const primaryBtnStyle = { minHeight: 42, border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", padding: "0 18px", fontWeight: 800, cursor: "pointer", justifySelf: "start" };
const secondaryBtnStyle = { minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const successStyle = { padding: 12, borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
