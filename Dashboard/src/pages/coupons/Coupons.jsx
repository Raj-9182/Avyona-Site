import React from "react";
import { COUPON_STATUS, couponRules, normalizeCouponCode } from "../../../../shared/coupons";
import {
  createCoupon,
  deleteCoupon,
  fetchCategories,
  fetchCoupons,
  updateCoupon,
  updateCouponStatus
} from "../../api/adminApi";
import { canAccess } from "../../utils/accessControl";

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

function formatCouponDateRange(coupon) {
  const start = coupon.startDate || "No start date";
  const end = coupon.endDate || "No end date";
  return `${start} - ${end}`;
}

function getCategorySummary(categories = []) {
  if (!categories.length) return { primary: "All categories", extraCount: 0 };
  const visible = categories.slice(0, 3).join(", ");
  return { primary: visible, extraCount: Math.max(categories.length - 3, 0) };
}

function getConditionSummary(coupon) {
  return [
    coupon.customerEligibility ? `${coupon.customerEligibility} customers` : "All customers",
    coupon.oneUsePerCustomer ? "One use/customer" : "Multiple uses/customer",
    coupon.stackable ? "Stackable" : "Not stackable",
    coupon.autoApply ? "Auto apply" : null
  ].filter(Boolean);
}

function getStatusStyle(status) {
  if (status === "active") return { background: "#dcfce7", color: "#166534" };
  if (status === "scheduled") return { background: "#dbeafe", color: "#1d4ed8" };
  if (status === "paused") return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function getFormErrors(form, coupons, editingCouponId = null) {
  const errors = [];
  const normalizedCode = normalizeCouponCode(form.code);
  const discountValue = Number(form.discountValue || 0);
  const minSubtotal = Number(form.minSubtotal || 0);
  const maxDiscount = Number(form.maxDiscount || 0);

  if (!normalizedCode) errors.push("Coupon code is required.");
  if (!/^[A-Z0-9_-]{3,24}$/.test(normalizedCode)) errors.push("Coupon code can use 3-24 letters, numbers, underscores, or hyphens.");
  if (coupons.some((coupon) => Number(coupon.id) !== Number(editingCouponId) && normalizeCouponCode(coupon.code) === normalizedCode)) errors.push("A coupon with this code already exists.");
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
  const [categoryOptions, setCategoryOptions] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState(createEmptyCouponForm);
  const [formMessage, setFormMessage] = React.useState("");
  const [sourceMessage, setSourceMessage] = React.useState("Loading coupons...");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingCouponId, setEditingCouponId] = React.useState(null);
  const canCreateCoupons = canAccess("coupons", "create");
  const canEditCoupons = canAccess("coupons", "edit");
  const canDeleteCoupons = canAccess("coupons", "delete");

  const loadCoupons = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchCoupons();
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setCoupons(rows);
      setSourceMessage("Coupons loaded from backend.");
    } catch (error) {
      setCoupons(couponRules);
      setSourceMessage(error.response?.data?.message || "Backend coupons unavailable. Showing local preview coupons.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      await loadCoupons();

      try {
        const response = await fetchCategories();
        if (!isMounted) return;
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        setCategoryOptions([...new Set(rows.filter((category) => category.status === "active").map((category) => category.name).filter(Boolean))].sort());
      } catch {
        if (isMounted) setCategoryOptions([]);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [loadCoupons]);

  const filteredCoupons = coupons.filter((coupon) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [coupon.code, coupon.title, coupon.description].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus = statusFilter === "all" || coupon.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleCouponStatus = async (couponId) => {
    const currentCoupon = coupons.find((coupon) => Number(coupon.id) === Number(couponId));
    const nextStatus = currentCoupon?.status === COUPON_STATUS.ACTIVE ? COUPON_STATUS.PAUSED : COUPON_STATUS.ACTIVE;

    setCoupons((current) => current.map((coupon) => (
      Number(coupon.id) === Number(couponId) ? { ...coupon, status: nextStatus } : coupon
    )));

    try {
      const response = await updateCouponStatus(couponId, nextStatus);
      const updated = response.data?.data;
      if (updated) {
        setCoupons((current) => current.map((coupon) => Number(coupon.id) === Number(couponId) ? updated : coupon));
      }
      setSourceMessage("Coupon status updated.");
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Unable to update coupon status.");
      loadCoupons();
    }
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
    setEditingCouponId(null);
  };

  const startEditCoupon = (coupon) => {
    setEditingCouponId(coupon.id);
    setForm({
      ...createEmptyCouponForm(),
      ...coupon,
      discountValue: String(coupon.discountValue || ""),
      maxDiscount: String(coupon.maxDiscount || ""),
      minSubtotal: String(coupon.minSubtotal || ""),
      usageLimit: String(coupon.usageLimit || ""),
      usedCount: String(coupon.usedCount || "0"),
      eligibleCategories: Array.isArray(coupon.eligibleCategories) ? coupon.eligibleCategories : []
    });
    setFormMessage("");
    setFormOpen(true);
  };

  const handleDeleteCoupon = async (couponId) => {
    setCoupons((current) => current.filter((coupon) => Number(coupon.id) !== Number(couponId)));
    try {
      await deleteCoupon(couponId);
      setSourceMessage("Coupon deleted.");
      if (Number(editingCouponId) === Number(couponId)) resetForm();
    } catch (error) {
      setSourceMessage(error.response?.data?.message || "Unable to delete coupon.");
      loadCoupons();
    }
  };

  const handleSaveCoupon = async (event) => {
    event.preventDefault();
    const errors = getFormErrors(form, coupons, editingCouponId);

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

    setIsSaving(true);
    setFormMessage("");

    try {
      const response = editingCouponId
        ? await updateCoupon(editingCouponId, nextCoupon)
        : await createCoupon(nextCoupon);
      const savedCoupon = response.data?.data;

      setCoupons((current) => {
        if (editingCouponId) {
          return current.map((coupon) => Number(coupon.id) === Number(editingCouponId) ? savedCoupon : coupon);
        }
        return [savedCoupon, ...current];
      });
      setSourceMessage(editingCouponId ? "Coupon updated successfully." : "Coupon created successfully.");
      resetForm();
      setFormOpen(false);
    } catch (error) {
      setFormMessage(error.response?.data?.message || "Unable to save coupon.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={pageStyle}>
      <section style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Promotions</span>
          <h2 style={titleStyle}>Coupons</h2>
          <p style={mutedTextStyle}>Create and manage coupon rules for product pages and checkout discount validation.</p>
          <p style={{ margin: "8px 0 0", color: "#0f766e", fontWeight: 800, fontSize: "13px" }}>{sourceMessage}</p>
        </div>
        <div style={headerPillsStyle}>
          <span style={summaryPillStyle}>{`Total: ${coupons.length}`}</span>
          <span style={summaryPillStyle}>{`Active: ${coupons.filter((coupon) => coupon.status === "active").length}`}</span>
          {canCreateCoupons ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => {
                if (!formOpen) resetForm();
                setFormOpen((current) => !current);
              }}
            >
              {formOpen ? "Close Form" : "+ Add New Coupon"}
            </button>
          ) : null}
        </div>
      </section>

      {formOpen ? (
        <form style={formCardStyle} onSubmit={handleSaveCoupon}>
          <div>
            <span style={eyebrowStyle}>{editingCouponId ? "Edit Coupon" : "Create Coupon"}</span>
            <h3 style={formTitleStyle}>{editingCouponId ? "Update Coupon Rules" : "New Coupon Rules"}</h3>
            <p style={mutedTextStyle}>Saved coupon rules are stored in the backend database and remain available after refresh.</p>
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
            <button type="submit" style={{ ...primaryButtonStyle, opacity: isSaving ? 0.65 : 1 }} disabled={isSaving}>
              {isSaving ? "Saving..." : editingCouponId ? "Update Coupon" : "Create Coupon"}
            </button>
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
        {isLoading ? (
          <div style={{ ...cardStyle, gridColumn: "1 / -1", color: "#475569", fontWeight: 800 }}>Loading coupons...</div>
        ) : null}
        {filteredCoupons.map((coupon) => {
          const usagePercent = coupon.usageLimit ? Math.round((Number(coupon.usedCount || 0) / Number(coupon.usageLimit || 1)) * 100) : 0;
          const categorySummary = getCategorySummary(coupon.eligibleCategories);
          const conditions = getConditionSummary(coupon);

          return (
            <article key={coupon.id} style={cardStyle}>
              <div style={cardHeadStyle}>
                <div>
                  <span style={codeStyle}>{coupon.code}</span>
                  <h3 style={cardTitleStyle}>{coupon.title}</h3>
                </div>
                <span style={{ ...badgeStyle, ...getStatusStyle(coupon.status) }}>{coupon.status}</span>
              </div>
              <p style={descriptionStyle}>{coupon.description}</p>
              <div style={discountHeroStyle}>
                <div>
                  <span style={detailLabelStyle}>Discount</span>
                  <strong style={discountValueStyle}>{formatDiscount(coupon)}</strong>
                </div>
                <div style={validityPillStyle}>{formatCouponDateRange(coupon)}</div>
              </div>
              <div style={detailsGridStyle}>
                <div style={metricStyle}><span style={detailLabelStyle}>Minimum Cart</span><strong>{formatMoney(coupon.minSubtotal)}</strong></div>
                <div style={metricStyle}><span style={detailLabelStyle}>Max Discount</span><strong>{formatMoney(coupon.maxDiscount)}</strong></div>
              </div>
              <div style={categoryBlockStyle}>
                <span style={detailLabelStyle}>Eligible Categories</span>
                <div style={categorySummaryRowStyle}>
                  <strong style={categoryTextStyle}>{categorySummary.primary}</strong>
                  {categorySummary.extraCount ? <span style={countPillStyle}>{`+${categorySummary.extraCount}`}</span> : null}
                </div>
              </div>
              <div style={conditionListStyle}>
                {conditions.map((condition) => <span key={condition} style={conditionPillStyle}>{condition}</span>)}
              </div>
              <div style={usageBlockStyle}>
                <div style={usageHeadStyle}>
                  <span>{`Usage: ${coupon.usedCount}/${coupon.usageLimit}`}</span>
                  <strong>{`${usagePercent}%`}</strong>
                </div>
                <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: `${usagePercent}%` }} /></div>
              </div>
              <div style={actionRowStyle}>
                {canEditCoupons ? (
                  <>
                    <button type="button" style={coupon.status === "active" ? pauseButtonStyle : activateButtonStyle} onClick={() => toggleCouponStatus(coupon.id)}>
                      {coupon.status === "active" ? "Pause" : "Activate"}
                    </button>
                    <button type="button" style={secondaryButtonStyle} onClick={() => startEditCoupon(coupon)}>
                      Edit
                    </button>
                  </>
                ) : null}
                {canDeleteCoupons ? (
                  <button type="button" style={deleteButtonStyle} onClick={() => handleDeleteCoupon(coupon.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {!isLoading && !filteredCoupons.length ? (
          <div style={{ ...cardStyle, gridColumn: "1 / -1", color: "#64748b" }}>No coupons found for the current filters.</div>
        ) : null}
      </section>
    </div>
  );
}

const pageStyle = { display: "grid", gap: "18px", width: "100%" };
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  padding: "22px",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)"
};
const eyebrowStyle = { color: "#0f766e", fontSize: "12px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const titleStyle = { margin: "8px 0 0", fontSize: "clamp(30px, 2.4vw, 40px)", color: "#0f172a", lineHeight: 1.05 };
const mutedTextStyle = { margin: "8px 0 0", color: "#64748b", overflowWrap: "anywhere", lineHeight: 1.55 };
const headerPillsStyle = { display: "flex", gap: "10px", flexWrap: "nowrap", alignItems: "center" };
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
  gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 220px)",
  gap: "14px",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "rgba(255, 255, 255, 0.86)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)"
};
const inputStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "0 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontSize: "14px"
};
const textareaStyle = { ...inputStyle, minHeight: "96px", padding: "12px", resize: "vertical" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 430px), 1fr))", gap: "16px", alignItems: "stretch" };
const cardStyle = {
  display: "grid",
  gap: "14px",
  minWidth: 0,
  alignContent: "start",
  padding: "18px",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  background: "#fff",
  boxShadow: "0 12px 26px rgba(15, 23, 42, 0.06)"
};
const formCardStyle = { ...cardStyle, padding: "22px" };
const cardHeadStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" };
const codeStyle = { color: "#0f766e", fontSize: "12px", fontWeight: 900, letterSpacing: "0.08em" };
const cardTitleStyle = { margin: "6px 0 0", color: "#0f172a", overflowWrap: "anywhere", fontSize: "21px", lineHeight: 1.18 };
const formTitleStyle = { margin: "8px 0 0", color: "#0f172a", fontSize: "28px" };
const badgeStyle = { display: "inline-flex", padding: "7px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800, textTransform: "capitalize" };
const descriptionStyle = {
  margin: 0,
  minHeight: "48px",
  color: "#64748b",
  lineHeight: 1.55,
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflowWrap: "anywhere"
};
const discountHeroStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0"
};
const detailLabelStyle = { display: "block", marginBottom: "5px", color: "#64748b", fontSize: "12px", fontWeight: 700 };
const discountValueStyle = { display: "block", color: "#0f172a", fontSize: "21px", lineHeight: 1.15 };
const validityPillStyle = {
  flex: "0 0 auto",
  maxWidth: "52%",
  padding: "8px 10px",
  borderRadius: "999px",
  background: "#eef6ff",
  color: "#1e3a8a",
  fontSize: "12px",
  fontWeight: 800,
  textAlign: "right",
  overflowWrap: "anywhere"
};
const detailsGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px", minWidth: 0, overflowWrap: "anywhere" };
const metricStyle = { padding: "12px", borderRadius: "12px", background: "#ffffff", border: "1px solid #e8eef5", color: "#0f172a" };
const categoryBlockStyle = { display: "grid", gap: "4px", minWidth: 0, padding: "12px", borderRadius: "12px", background: "#f8fafc", color: "#334155", overflow: "hidden" };
const categorySummaryRowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", minWidth: 0 };
const categoryTextStyle = {
  minWidth: 0,
  color: "#24364f",
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};
const countPillStyle = { flex: "0 0 auto", padding: "4px 8px", borderRadius: "999px", background: "#e0f2fe", color: "#0369a1", fontSize: "12px", fontWeight: 900 };
const conditionListStyle = { display: "flex", flexWrap: "wrap", gap: "8px" };
const conditionPillStyle = { padding: "7px 9px", borderRadius: "999px", background: "#f1f5f9", color: "#334155", fontSize: "12px", fontWeight: 800 };
const usageBlockStyle = { display: "grid", gap: "8px" };
const usageHeadStyle = { display: "flex", justifyContent: "space-between", color: "#475569", fontWeight: 700 };
const progressTrackStyle = { height: "8px", borderRadius: "999px", background: "#e2e8f0", overflow: "hidden" };
const progressFillStyle = { height: "100%", borderRadius: "999px", background: "#16a34a" };
const actionRowStyle = { display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "nowrap", paddingTop: "2px" };
const primaryButtonStyle = { minHeight: "40px", padding: "0 16px", borderRadius: "10px", border: "1px solid #16a34a", background: "#16a34a", color: "#fff", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { minHeight: "36px", padding: "0 13px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#fff", color: "#334155", fontWeight: 800, cursor: "pointer" };
const activateButtonStyle = { ...secondaryButtonStyle, background: "#16a34a", color: "#fff", borderColor: "#16a34a" };
const pauseButtonStyle = { ...secondaryButtonStyle, background: "#fff7ed", color: "#c2410c", borderColor: "#fed7aa" };
const deleteButtonStyle = { ...secondaryButtonStyle, background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" };
const formGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "14px" };
const fieldStyle = { display: "grid", gap: "8px", color: "#334155", fontWeight: 700 };
const categorySelectorStyle = { display: "grid", gap: "14px", padding: "16px", borderRadius: "14px", background: "#f8fafc", border: "1px solid #e2e8f0" };
const categoryGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" };
const categoryOptionStyle = { display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "10px", background: "#fff", border: "1px solid #dbe7f0", color: "#334155", fontWeight: 700 };
const conditionGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" };
const toggleStyle = { display: "flex", alignItems: "center", gap: "10px", minHeight: "42px", padding: "0 12px", borderRadius: "10px", border: "1px solid #dbe7f0", background: "#fff", color: "#334155", fontWeight: 700 };
const previewBoxStyle = { padding: "14px", borderRadius: "14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" };
const errorBoxStyle = { padding: "12px 14px", borderRadius: "12px", background: "#fff1f2", border: "1px solid #fecaca", color: "#b91c1c", fontWeight: 700 };
const formActionsStyle = { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "nowrap" };
