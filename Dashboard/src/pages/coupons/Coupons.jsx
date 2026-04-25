import React from "react";
import { COUPON_STATUS, couponRules, normalizeCouponCode } from "../../../../shared/coupons";
import products from "../../data/products";

const categoryOptions = [...new Set(products.map((product) => product.category).filter(Boolean))].sort();

function createEmptyCouponForm() {
  return {
    code: "",
    title: "",
    description: "",
    discountType: "percent",
    discountValue: "10",
    maxDiscount: "1000",
    minSubtotal: "2999",
    eligibleCategories: [],
    usageLimit: "500",
    usedCount: "0",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    status: COUPON_STATUS.ACTIVE,
    customerEligibility: "all",
    oneUsePerCustomer: true,
    stackable: false,
    autoApply: false
  };
}

function formatDiscount(coupon) {
  if (coupon.discountType === "fixed") return `Rs. ${Number(coupon.discountValue || 0).toLocaleString("en-IN")} off`;
  return `${coupon.discountValue}% off`;
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function getStatusStyle(status) {
  if (status === "active") return { background: "#dcfce7", color: "#166534" };
  if (status === "scheduled") return { background: "#dbeafe", color: "#1d4ed8" };
  if (status === "paused") return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function getFormErrors(form, coupons) {
  const errors = [];
  const normalizedCode = normalizeCouponCode(form.code);
  const discountValue = Number(form.discountValue || 0);
  const minSubtotal = Number(form.minSubtotal || 0);
  const maxDiscount = Number(form.maxDiscount || 0);

  if (!normalizedCode) errors.push("Coupon code is required.");
  if (!/^[A-Z0-9_-]{3,24}$/.test(normalizedCode)) errors.push("Coupon code can use 3-24 letters, numbers, underscores, or hyphens.");
  if (coupons.some((coupon) => normalizeCouponCode(coupon.code) === normalizedCode)) errors.push("A coupon with this code already exists.");
  if (!form.title.trim()) errors.push("Coupon title is required.");
  if (discountValue <= 0) errors.push("Discount value must be greater than zero.");
  if (form.discountType === "percent" && discountValue > 90) errors.push("Percentage discount cannot be more than 90%.");
  if (minSubtotal < 0) errors.push("Minimum order value cannot be negative.");
  if (maxDiscount < 0) errors.push("Maximum discount cannot be negative.");
  if (form.discountType === "percent" && maxDiscount <= 0) errors.push("Maximum discount is required for percentage coupons.");
  if (!form.startDate) errors.push("Start date is required.");
  if (!form.endDate) errors.push("End date is required.");
  if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) errors.push("End date must be after start date.");
  if (Number(form.usageLimit || 0) <= 0) errors.push("Usage limit must be greater than zero.");

  return errors;
}

export default function Coupons() {
  const [coupons, setCoupons] = React.useState(couponRules);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(createEmptyCouponForm);
  const [formMessage, setFormMessage] = React.useState("");

  const filteredCoupons = coupons.filter((coupon) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [coupon.code, coupon.title, coupon.description].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || coupon.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleCouponStatus = (couponId) => {
    setCoupons((current) => current.map((coupon) => (
      coupon.id === couponId
        ? { ...coupon, status: coupon.status === COUPON_STATUS.ACTIVE ? COUPON_STATUS.PAUSED : COUPON_STATUS.ACTIVE }
        : coupon
    )));
  };

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormMessage("");
  };

  const toggleCategory = (category) => {
    setForm((current) => ({
      ...current,
      eligibleCategories: current.eligibleCategories.includes(category)
        ? current.eligibleCategories.filter((item) => item !== category)
        : [...current.eligibleCategories, category]
    }));
    setFormMessage("");
  };

  const resetForm = () => {
    setForm(createEmptyCouponForm());
    setFormMessage("");
  };

  const handleCreateCoupon = (event) => {
    event.preventDefault();
    const errors = getFormErrors(form, coupons);

    if (errors.length) {
      setFormMessage(errors[0]);
      return;
    }

    const nextCoupon = {
      id: `coupon-${normalizeCouponCode(form.code).toLowerCase()}-${Date.now()}`,
      code: normalizeCouponCode(form.code),
      title: form.title.trim(),
      description: form.description.trim() || `${form.discountValue}${form.discountType === "percent" ? "%" : " rupees"} off for eligible orders.`,
      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      minSubtotal: Number(form.minSubtotal || 0),
      eligibleCategories: form.eligibleCategories,
      usageLimit: Number(form.usageLimit || 0),
      usedCount: Number(form.usedCount || 0),
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      customerEligibility: form.customerEligibility,
      oneUsePerCustomer: Boolean(form.oneUsePerCustomer),
      stackable: Boolean(form.stackable),
      autoApply: Boolean(form.autoApply)
    };

    setCoupons((current) => [nextCoupon, ...current]);
    resetForm();
    setFormOpen(false);
  };

  return (
    <div style={pageStyle}>
      <section style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Promotions</span>
          <h2 style={titleStyle}>Coupons</h2>
          <p style={mutedTextStyle}>Create and manage local coupon rules for product pages and checkout discount validation.</p>
        </div>
        <div style={headerPillsStyle}>
          <span style={summaryPillStyle}>{`Total: ${coupons.length}`}</span>
          <span style={summaryPillStyle}>{`Active: ${coupons.filter((coupon) => coupon.status === "active").length}`}</span>
          <button type="button" style={primaryButtonStyle} onClick={() => setFormOpen((current) => !current)}>
            {formOpen ? "Close Form" : "+ Add New Coupon"}
          </button>
        </div>
      </section>

      {formOpen ? (
        <form style={formCardStyle} onSubmit={handleCreateCoupon}>
          <div>
            <span style={eyebrowStyle}>Create Coupon</span>
            <h3 style={formTitleStyle}>New Coupon Rules</h3>
            <p style={mutedTextStyle}>This creates a local dashboard coupon preview. Backend wiring can persist the same fields later.</p>
          </div>

          {formMessage ? <div style={errorBoxStyle}>{formMessage}</div> : null}

          <section style={formGridStyle}>
            <label style={fieldStyle}>
              <span>Coupon Code</span>
              <input value={form.code} onChange={(event) => updateForm("code", event.target.value.toUpperCase())} placeholder="NEWYEAR20" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Coupon Title</span>
              <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="New Year Sale" style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Discount Type</span>
              <select value={form.discountType} onChange={(event) => updateForm("discountType", event.target.value)} style={inputStyle}>
                <option value="percent">Percentage Discount</option>
                <option value="fixed">Flat Amount Discount</option>
              </select>
            </label>
            <label style={fieldStyle}>
              <span>{form.discountType === "percent" ? "Discount Percentage" : "Discount Amount"}</span>
              <input type="number" min="1" value={form.discountValue} onChange={(event) => updateForm("discountValue", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Minimum Order Value</span>
              <input type="number" min="0" value={form.minSubtotal} onChange={(event) => updateForm("minSubtotal", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Maximum Discount Price</span>
              <input type="number" min="0" value={form.maxDiscount} onChange={(event) => updateForm("maxDiscount", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Start Date</span>
              <input type="date" value={form.startDate} onChange={(event) => updateForm("startDate", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>End Date</span>
              <input type="date" value={form.endDate} onChange={(event) => updateForm("endDate", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Total Usage Limit</span>
              <input type="number" min="1" value={form.usageLimit} onChange={(event) => updateForm("usageLimit", event.target.value)} style={inputStyle} />
            </label>
            <label style={fieldStyle}>
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateForm("status", event.target.value)} style={inputStyle}>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </label>
          </section>

          <label style={fieldStyle}>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Describe who can use this coupon and what it does." style={textareaStyle} />
          </label>

          <section style={categorySelectorStyle}>
            <div>
              <strong>Apply To Particular Categories</strong>
              <p style={mutedTextStyle}>Leave all unchecked to apply this coupon to all product categories.</p>
            </div>
            <div style={categoryGridStyle}>
              {categoryOptions.map((category) => (
                <label key={category} style={categoryOptionStyle}>
                  <input type="checkbox" checked={form.eligibleCategories.includes(category)} onChange={() => toggleCategory(category)} />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </section>

          <section style={conditionGridStyle}>
            <label style={fieldStyle}>
              <span>Customer Eligibility</span>
              <select value={form.customerEligibility} onChange={(event) => updateForm("customerEligibility", event.target.value)} style={inputStyle}>
                <option value="all">All Customers</option>
                <option value="new">New Customers Only</option>
                <option value="returning">Returning Customers Only</option>
              </select>
            </label>
            <label style={toggleStyle}>
              <input type="checkbox" checked={form.oneUsePerCustomer} onChange={(event) => updateForm("oneUsePerCustomer", event.target.checked)} />
              <span>One use per customer</span>
            </label>
            <label style={toggleStyle}>
              <input type="checkbox" checked={form.stackable} onChange={(event) => updateForm("stackable", event.target.checked)} />
              <span>Can combine with other offers</span>
            </label>
            <label style={toggleStyle}>
              <input type="checkbox" checked={form.autoApply} onChange={(event) => updateForm("autoApply", event.target.checked)} />
              <span>Auto apply when eligible</span>
            </label>
          </section>

          <section style={previewBoxStyle}>
            <strong>Preview</strong>
            <p style={mutedTextStyle}>
              {`${normalizeCouponCode(form.code) || "COUPON"} gives ${form.discountType === "percent" ? `${form.discountValue}%` : formatMoney(form.discountValue)} off, minimum order ${formatMoney(form.minSubtotal)}, max discount ${formatMoney(form.maxDiscount)}, for ${form.eligibleCategories.length ? form.eligibleCategories.join(", ") : "all categories"}.`}
            </p>
          </section>

          <div style={formActionsStyle}>
            <button type="button" style={secondaryButtonStyle} onClick={resetForm}>Reset</button>
            <button type="submit" style={primaryButtonStyle}>Create Coupon</button>
          </div>
        </form>
      ) : null}

      <section style={toolbarStyle}>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by code, title, or description"
          style={inputStyle}
        />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="paused">Paused</option>
          <option value="expired">Expired</option>
        </select>
      </section>

      <section style={gridStyle}>
        {filteredCoupons.map((coupon) => {
          const usagePercent = coupon.usageLimit ? Math.round((Number(coupon.usedCount || 0) / Number(coupon.usageLimit || 1)) * 100) : 0;

          return (
            <article key={coupon.id} style={cardStyle}>
              <div style={cardHeadStyle}>
                <div>
                  <span style={codeStyle}>{coupon.code}</span>
                  <h3 style={cardTitleStyle}>{coupon.title}</h3>
                </div>
                <span style={{ ...badgeStyle, ...getStatusStyle(coupon.status) }}>{coupon.status}</span>
              </div>
              <p style={mutedTextStyle}>{coupon.description}</p>
              <div style={detailsGridStyle}>
                <div><span>Discount</span><strong>{formatDiscount(coupon)}</strong></div>
                <div><span>Minimum Cart</span><strong>{formatMoney(coupon.minSubtotal)}</strong></div>
                <div><span>Max Discount</span><strong>{formatMoney(coupon.maxDiscount)}</strong></div>
                <div><span>Validity</span><strong>{`${coupon.startDate} to ${coupon.endDate}`}</strong></div>
              </div>
              <div style={categoryBlockStyle}>
                <span>Eligible Categories</span>
                <strong>{coupon.eligibleCategories.length ? coupon.eligibleCategories.join(", ") : "All categories"}</strong>
              </div>
              <div style={categoryBlockStyle}>
                <span>Conditions</span>
                <strong>{[
                  coupon.customerEligibility ? `Customers: ${coupon.customerEligibility}` : "",
                  coupon.oneUsePerCustomer ? "One use/customer" : "",
                  coupon.stackable ? "Stackable" : "Not stackable",
                  coupon.autoApply ? "Auto apply" : ""
                ].filter(Boolean).join(" | ")}</strong>
              </div>
              <div style={usageBlockStyle}>
                <div style={usageHeadStyle}>
                  <span>{`Usage: ${coupon.usedCount}/${coupon.usageLimit}`}</span>
                  <strong>{`${usagePercent}%`}</strong>
                </div>
                <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: `${usagePercent}%` }} /></div>
              </div>
              <div style={actionRowStyle}>
                <button type="button" style={coupon.status === "active" ? pauseButtonStyle : activateButtonStyle} onClick={() => toggleCouponStatus(coupon.id)}>
                  {coupon.status === "active" ? "Pause" : "Activate"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

const pageStyle = { display: "grid", gap: "20px" };
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  padding: "24px",
  borderRadius: "22px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "linear-gradient(135deg, #ffffff 0%, #f5fbf7 56%, #edf7ff 100%)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)"
};
const eyebrowStyle = { color: "#0f766e", fontSize: "12px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const titleStyle = { margin: "8px 0 0", fontSize: "42px", color: "#0f172a" };
const mutedTextStyle = { margin: "8px 0 0", color: "#64748b" };
const headerPillsStyle = { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" };
const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#fff",
  color: "#475569",
  fontWeight: 700,
  fontSize: "12px",
  border: "1px solid #edf2f7"
};
const toolbarStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 220px",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "#fff"
};
const inputStyle = {
  width: "100%",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff"
};
const textareaStyle = { ...inputStyle, minHeight: "96px", padding: "12px", resize: "vertical" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "18px" };
const cardStyle = {
  display: "grid",
  gap: "16px",
  padding: "18px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "#fff",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)"
};
const formCardStyle = { ...cardStyle, padding: "22px" };
const cardHeadStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" };
const codeStyle = { color: "#0f766e", fontSize: "13px", fontWeight: 900, letterSpacing: "0.08em" };
const cardTitleStyle = { margin: "6px 0 0", color: "#0f172a" };
const formTitleStyle = { margin: "8px 0 0", color: "#0f172a", fontSize: "28px" };
const badgeStyle = { display: "inline-flex", padding: "7px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, textTransform: "capitalize" };
const detailsGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" };
const categoryBlockStyle = { display: "grid", gap: "6px", padding: "12px", borderRadius: "12px", background: "#f8fafc", color: "#334155" };
const usageBlockStyle = { display: "grid", gap: "8px" };
const usageHeadStyle = { display: "flex", justifyContent: "space-between", color: "#475569", fontWeight: 700 };
const progressTrackStyle = { height: "9px", borderRadius: "999px", background: "#e2e8f0", overflow: "hidden" };
const progressFillStyle = { height: "100%", borderRadius: "999px", background: "#16a34a" };
const actionRowStyle = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" };
const primaryButtonStyle = { minHeight: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { minHeight: "38px", padding: "0 14px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 800, cursor: "pointer" };
const activateButtonStyle = { ...secondaryButtonStyle, background: "#16a34a", color: "#fff", borderColor: "#16a34a" };
const pauseButtonStyle = { ...secondaryButtonStyle, background: "#fff7ed", color: "#c2410c", borderColor: "#fed7aa" };
const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" };
const fieldStyle = { display: "grid", gap: "8px", color: "#334155", fontWeight: 700 };
const categorySelectorStyle = { display: "grid", gap: "14px", padding: "16px", borderRadius: "14px", background: "#f8fafc", border: "1px solid #e2e8f0" };
const categoryGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" };
const categoryOptionStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "10px", background: "#fff", border: "1px solid #dbe7f0", color: "#334155", fontWeight: 700 };
const conditionGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" };
const toggleStyle = { display: "flex", alignItems: "center", gap: "10px", minHeight: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid #dbe7f0", background: "#fff", color: "#334155", fontWeight: 700 };
const previewBoxStyle = { padding: "14px", borderRadius: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };
const errorBoxStyle = { padding: "12px 14px", borderRadius: "12px", background: "#fff1f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 700 };
const formActionsStyle = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" };
