import React from "react";
import {
  createCreditRule,
  deleteCreditRule,
  fetchCreditRules,
  updateCreditRule,
  updateCreditRuleStatus
} from "../../api/adminApi";

const RULE_TYPES = [
  { value: "bonus", label: "Bonus" },
  { value: "cashback", label: "Cashback" },
  { value: "campaign", label: "Campaign" },
  { value: "milestone", label: "Milestone" }
];

const TRIGGERS = [
  { value: "signup", label: "Signup" },
  { value: "referral", label: "Referral" },
  { value: "purchase", label: "Purchase" },
  { value: "review", label: "Review" },
  { value: "milestone", label: "Milestone" },
  { value: "manual_reward", label: "Manual Reward" },
  { value: "festival_campaign", label: "Festival Campaign" }
];

const REWARD_TARGETS = [
  { value: "customer", label: "Customer" },
  { value: "referrer", label: "Referrer" },
  { value: "referee", label: "Referee" },
  { value: "both", label: "Both" }
];

function emptyForm() {
  return {
    ruleName: "",
    ruleType: "bonus",
    triggerEvent: "signup",
    rewardPoints: "",
    cashbackValue: "",
    cashbackPercent: "",
    milestoneOrderCount: "",
    rewardTarget: "customer",
    priority: "100",
    maxUsage: "",
    status: "active",
    expiryDate: "",
    minOrderValue: "",
    maxRewardLimit: ""
  };
}

export default function RewardRules() {
  const [rules, setRules] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState(emptyForm);

  const loadRules = React.useCallback(() => {
    setLoading(true);
    setError("");
    fetchCreditRules()
      .then((res) => setRules(res.data?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load reward rules."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadRules();
  }, [loadRules]);

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setMessage("");
    setError("");
    setForm({
      ruleName: rule.ruleName || "",
      ruleType: rule.ruleType || "bonus",
      triggerEvent: rule.triggerEvent || "signup",
      rewardPoints: rule.rewardPoints || "",
      cashbackValue: rule.cashbackValue || "",
      cashbackPercent: rule.cashbackPercent ?? "",
      milestoneOrderCount: rule.milestoneOrderCount ?? "",
      rewardTarget: rule.rewardTarget || "customer",
      priority: rule.priority ?? "100",
      maxUsage: rule.maxUsage ?? "",
      status: rule.status || "active",
      expiryDate: rule.expiryDate ? String(rule.expiryDate).slice(0, 10) : "",
      minOrderValue: rule.minOrderValue || "",
      maxRewardLimit: rule.maxRewardLimit || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submitRule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      ...form,
      rewardPoints: Number(form.rewardPoints),
      cashbackValue: form.cashbackValue === "" ? undefined : Number(form.cashbackValue),
      cashbackPercent: form.cashbackPercent === "" ? undefined : Number(form.cashbackPercent),
      milestoneOrderCount: form.milestoneOrderCount === "" ? undefined : Number(form.milestoneOrderCount),
      rewardTarget: form.rewardTarget,
      priority: form.priority === "" ? 100 : Number(form.priority),
      maxUsage: form.maxUsage === "" ? undefined : Number(form.maxUsage),
      minOrderValue: form.minOrderValue === "" ? undefined : Number(form.minOrderValue),
      maxRewardLimit: form.maxRewardLimit === "" ? undefined : Number(form.maxRewardLimit),
      expiryDate: form.expiryDate || null
    };

    try {
      if (editingId) {
        await updateCreditRule(editingId, payload);
        setMessage("Reward rule updated.");
      } else {
        await createCreditRule(payload);
        setMessage("Reward rule created.");
      }
      resetForm();
      loadRules();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save reward rule.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (rule) => {
    const nextStatus = rule.status === "active" ? "inactive" : "active";
    setError("");
    try {
      await updateCreditRuleStatus(rule.id, nextStatus);
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, status: nextStatus } : item));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to update rule status.");
    }
  };

  const removeRule = async (rule) => {
    if (!window.confirm(`Delete "${rule.ruleName}"?`)) return;
    setError("");
    try {
      await deleteCreditRule(rule.id);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      setMessage("Reward rule deleted.");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete reward rule.");
    }
  };

  return (
    <div style={wrapStyle}>
      <form style={panelStyle} onSubmit={submitRule}>
        <div style={headerStyle}>
          <div>
            <span style={eyebrowStyle}>Earning Logic</span>
            <h3 style={titleStyle}>{editingId ? "Edit Reward Rule" : "Create Reward Rule"}</h3>
          </div>
          {editingId && <button type="button" style={secondaryBtnStyle} onClick={resetForm}>Cancel Edit</button>}
        </div>
        <div style={gridStyle}>
          <label style={fieldStyle}>Rule Name<input style={inputStyle} value={form.ruleName} onChange={(e) => setForm({ ...form, ruleName: e.target.value })} required /></label>
          <label style={fieldStyle}>Rule Type<select style={inputStyle} value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })}>{RULE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label style={fieldStyle}>Trigger<select style={inputStyle} value={form.triggerEvent} onChange={(e) => setForm({ ...form, triggerEvent: e.target.value, rewardTarget: e.target.value === "referral" && form.rewardTarget === "customer" ? "referrer" : form.rewardTarget })}>{TRIGGERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label style={fieldStyle}>Reward Points<input style={inputStyle} type="number" min="0" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} required={form.triggerEvent !== "purchase"} placeholder={form.triggerEvent === "purchase" ? "Optional fixed points" : ""} /></label>
          <label style={fieldStyle}>Cashback Value<input style={inputStyle} type="number" min="0" step="0.01" value={form.cashbackValue} onChange={(e) => setForm({ ...form, cashbackValue: e.target.value })} placeholder="Auto from points" /></label>
          <label style={fieldStyle}>Cashback Percent<input style={inputStyle} type="number" min="0" step="0.001" value={form.cashbackPercent} onChange={(e) => setForm({ ...form, cashbackPercent: e.target.value })} placeholder="Purchase rules only" /></label>
          <label style={fieldStyle}>Milestone Order Count<input style={inputStyle} type="number" min="1" value={form.milestoneOrderCount} onChange={(e) => setForm({ ...form, milestoneOrderCount: e.target.value })} placeholder="5, 10, 20..." /></label>
          <label style={fieldStyle}>Reward Target<select style={inputStyle} value={form.rewardTarget} onChange={(e) => setForm({ ...form, rewardTarget: e.target.value })}>{REWARD_TARGETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label style={fieldStyle}>Priority<input style={inputStyle} type="number" min="0" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></label>
          <label style={fieldStyle}>Max Usage<input style={inputStyle} type="number" min="1" value={form.maxUsage} onChange={(e) => setForm({ ...form, maxUsage: e.target.value })} placeholder="Unlimited" /></label>
          <label style={fieldStyle}>Status<select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label style={fieldStyle}>Min Order Value<input style={inputStyle} type="number" min="0" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} /></label>
          <label style={fieldStyle}>Max Reward Limit<input style={inputStyle} type="number" min="0" value={form.maxRewardLimit} onChange={(e) => setForm({ ...form, maxRewardLimit: e.target.value })} /></label>
          <label style={fieldStyle}>Expiry Date<input style={inputStyle} type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} /></label>
        </div>
        <button type="submit" style={primaryBtnStyle} disabled={saving}>{saving ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}</button>
      </form>

      {message && <div style={successStyle}>{message}</div>}
      {error && <div style={errorStyle}>{error}</div>}

      <div style={panelStyle}>
        <div style={headerStyle}>
          <div>
            <span style={eyebrowStyle}>Live Rules</span>
            <h3 style={titleStyle}>Reward Rules</h3>
          </div>
          <button type="button" style={secondaryBtnStyle} onClick={loadRules}>Refresh</button>
        </div>
        {loading ? <p style={mutedStyle}>Loading reward rules...</p> : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Rule</th><th style={thStyle}>Trigger</th><th style={thStyle}>Reward</th><th style={thStyle}>Conditions</th><th style={thStyle}>Usage</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td style={tdStyle}><strong>{rule.ruleName}</strong><br /><span style={mutedStyle}>{rule.ruleType}{rule.isDefault ? " - default" : ""}</span></td>
                    <td style={tdStyle}>{rule.triggerEvent}<br /><span style={mutedStyle}>{rule.rewardTarget || "customer"}</span></td>
                    <td style={tdStyle}>
                      {Number(rule.rewardPoints || 0).toLocaleString()} pts
                      {rule.cashbackPercent != null ? <><br /><span style={mutedStyle}>{Number(rule.cashbackPercent)}% cashback</span></> : null}
                    </td>
                    <td style={tdStyle}>
                      {rule.milestoneOrderCount ? <span>{rule.milestoneOrderCount} delivered orders</span> : <span>-</span>}
                      <br /><span style={mutedStyle}>Priority {Number(rule.priority ?? 100)}</span>
                      {rule.minOrderValue ? <><br /><span style={mutedStyle}>Min Rs {Number(rule.minOrderValue).toLocaleString()}</span></> : null}
                      {rule.maxRewardLimit ? <><br /><span style={mutedStyle}>Cap {Number(rule.maxRewardLimit).toLocaleString()} pts</span></> : null}
                    </td>
                    <td style={tdStyle}>{Number(rule.usedCount || 0).toLocaleString()}{rule.maxUsage ? ` / ${Number(rule.maxUsage).toLocaleString()}` : " / unlimited"}</td>
                    <td style={tdStyle}><span style={rule.status === "active" ? activePillStyle : inactivePillStyle}>{rule.status}</span></td>
                    <td style={tdStyle}>
                      <div style={actionsStyle}>
                        <button type="button" style={secondaryBtnStyle} onClick={() => toggleStatus(rule)}>{rule.status === "active" ? "Inactive" : "Active"}</button>
                        <button type="button" style={secondaryBtnStyle} onClick={() => startEdit(rule)}>Edit</button>
                        <button type="button" style={dangerBtnStyle} onClick={() => removeRule(rule)} disabled={rule.isDefault}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rules.length && <tr><td style={tdStyle} colSpan={7}>No reward rules found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const wrapStyle = { display: "grid", gap: 16 };
const panelStyle = { padding: 20, border: "1px solid #dbe5ef", borderRadius: 16, background: "#fff" };
const headerStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 };
const eyebrowStyle = { color: "#0f766e", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" };
const titleStyle = { margin: "4px 0 0", fontSize: 22, color: "#0f172a" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 14 };
const fieldStyle = { display: "grid", gap: 6, color: "#334155", fontSize: 13, fontWeight: 800 };
const inputStyle = { minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 12px", fontWeight: 700 };
const primaryBtnStyle = { minHeight: 42, border: 0, borderRadius: 10, background: "#16a34a", color: "#fff", padding: "0 18px", fontWeight: 800, cursor: "pointer" };
const secondaryBtnStyle = { minHeight: 34, border: "1px solid #cbd5e1", borderRadius: 9, background: "#fff", color: "#0f172a", padding: "0 12px", fontWeight: 800, cursor: "pointer" };
const dangerBtnStyle = { ...secondaryBtnStyle, color: "#dc2626", borderColor: "#fecaca", background: "#fff5f5" };
const successStyle = { padding: 12, borderRadius: 10, background: "#dcfce7", color: "#166534", fontWeight: 800 };
const errorStyle = { padding: 12, borderRadius: 10, background: "#fee2e2", color: "#dc2626", fontWeight: 800 };
const mutedStyle = { color: "#64748b", fontSize: 12, margin: 0 };
const tableWrapStyle = { overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 };
const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: 760 };
const thStyle = { padding: 12, textAlign: "left", color: "#334155", fontSize: 12, textTransform: "uppercase", background: "#f8fafc" };
const tdStyle = { padding: 12, borderTop: "1px solid #e2e8f0", color: "#0f172a", verticalAlign: "middle" };
const actionsStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
const activePillStyle = { padding: "5px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 12 };
const inactivePillStyle = { ...activePillStyle, background: "#f1f5f9", color: "#475569" };
