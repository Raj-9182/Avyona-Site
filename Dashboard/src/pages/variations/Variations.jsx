import React, { useMemo, useState } from "react";
import { allProducts } from "../../data/storefront-content";

const variantTypeOptions = ["Color", "Size", "Storage", "Material", "Bundle", "Finish"];

function getCleanGroupName(product) {
  if (!product) return "";
  return String(product.name || product.asin || "").trim();
}

export default function Variations() {
  const [formOpen, setFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [variantType, setVariantType] = useState("Color");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [savedGroups, setSavedGroups] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const filteredProducts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return allProducts.filter((product) => {
      if (!normalized) return true;
      return (
        String(product.name || "").toLowerCase().includes(normalized) ||
        String(product.asin || "").toLowerCase().includes(normalized)
      );
    });
  }, [searchTerm]);

  const selectedProductRecords = useMemo(
    () => allProducts.filter((product) => selectedProducts.includes(product.slug)),
    [selectedProducts]
  );

  const autoGroupName = useMemo(() => {
    if (!selectedProductRecords.length) return "";
    return getCleanGroupName(selectedProductRecords[0]);
  }, [selectedProductRecords]);

  const toggleProduct = (slug) => {
    setFeedback({ type: "", message: "" });
    setSelectedProducts((current) => (
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug]
    ));
  };

  const resetForm = () => {
    setSearchTerm("");
    setVariantType("Color");
    setSelectedProducts([]);
  };

  const buildGroupPayload = (status) => ({
    groupId: `GRP${String(savedGroups.length + 1001).padStart(4, "0")}`,
    groupName: autoGroupName || "Untitled Group",
    variantType,
    status,
    products: selectedProductRecords.map((product) => product.asin)
  });

  const handleSave = (status) => {
    if (selectedProductRecords.length < 2 || !autoGroupName) {
      return;
    }

    setSavedGroups((current) => [buildGroupPayload(status), ...current]);
    setFeedback({
      type: "success",
      message: status === "draft" ? "Variant group draft saved locally." : "Variant group saved locally."
    });
    resetForm();
    setFormOpen(false);
  };

  const handleClose = () => {
    resetForm();
    setFormOpen(false);
    setFeedback({ type: "", message: "" });
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Step 2: Group Creation Flow</span>
          <h2 style={{ margin: "8px 0 0", fontSize: "42px", color: "#0f172a" }}>Variations</h2>
          <p style={{ margin: "12px 0 0", color: "#526377", maxWidth: "780px" }}>
            Create a variant group by choosing multiple products through product name or ASIN search, then assign
            one shared variant type such as color, size, or storage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={pillStyle}>{`Catalog Products: ${allProducts.length}`}</span>
          <span style={pillStyle}>{`Selected: ${selectedProducts.length}`}</span>
          <span style={pillStyle}>{`Groups: ${savedGroups.length}`}</span>
          <button type="button" style={primaryButtonStyle} onClick={() => setFormOpen((current) => !current)}>
            {formOpen ? "Close Variant Group" : "+ Create Variant Group"}
          </button>
        </div>
      </section>

      {feedback.message ? (
        <section
          style={{
            ...feedbackBannerStyle,
            ...(feedback.type === "error" ? feedbackErrorStyle : feedbackSuccessStyle)
          }}
        >
          {feedback.message}
        </section>
      ) : null}

      {formOpen ? (
        <section style={cardStyle}>
          <div style={sectionHeadStyle}>
            <div>
              <span style={eyebrowStyle}>Variant Group Form</span>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: "30px" }}>Create Variant Group</h3>
              <p style={{ margin: "10px 0 0", color: "#526377", maxWidth: "760px" }}>
                Select multiple products by product name or ASIN, then choose the variant type for the group.
              </p>
            </div>
          </div>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Auto Group Name</span>
              <input
                type="text"
                value={autoGroupName}
                readOnly
                placeholder="Select products to generate group name"
                style={{ ...inputStyle, background: "#f8fafc", fontWeight: 700 }}
              />
              <small style={helperStyle}>
                Generated automatically from the first selected product using the clean product name.
              </small>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Search Products</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by product name or ASIN"
                style={inputStyle}
              />
              <small style={helperStyle}>You can search using product name or ASIN.</small>
            </label>

            <label style={fieldStyle}>
              <span style={labelStyle}>Variant Type</span>
              <select value={variantType} onChange={(event) => setVariantType(event.target.value)} style={inputStyle}>
                {variantTypeOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={selectionLayoutStyle}>
            <div style={selectionColumnStyle}>
              <div style={selectionHeadStyle}>
                <h4 style={subheadingStyle}>Select Products</h4>
                <span style={miniPillStyle}>{`${filteredProducts.length} Results`}</span>
              </div>

              <div style={pickerListStyle}>
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.slug);

                  return (
                    <button
                      key={product.slug}
                      type="button"
                      onClick={() => toggleProduct(product.slug)}
                      style={{
                        ...productPickerItemStyle,
                        ...(isSelected ? productPickerSelectedStyle : null)
                      }}
                    >
                      <div style={{ display: "grid", gap: "4px", textAlign: "left" }}>
                        <strong style={{ color: "#0f172a" }}>{product.name}</strong>
                        <span style={{ color: "#526377", fontSize: "13px" }}>{`ASIN: ${product.asin}`}</span>
                      </div>
                      <span style={isSelected ? selectedBadgeStyle : addBadgeStyle}>
                        {isSelected ? "Selected" : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={selectionColumnStyle}>
              <div style={selectionHeadStyle}>
                <h4 style={subheadingStyle}>Selected Products</h4>
                <span style={miniPillStyle}>{`${selectedProductRecords.length} Chosen`}</span>
              </div>

              {selectedProductRecords.length ? (
                <div style={selectedListStyle}>
                  {selectedProductRecords.map((product) => (
                  <div key={product.slug} style={selectedCardStyle}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <strong style={{ color: "#0f172a" }}>{product.name}</strong>
                        <span style={{ color: "#526377", fontSize: "13px" }}>{`ASIN: ${product.asin}`}</span>
                        <span style={{ color: "#64748b", fontSize: "13px" }}>{`Variant Type: ${variantType}`}</span>
                        {autoGroupName ? (
                          <span style={{ color: "#0f766e", fontSize: "13px", fontWeight: 700 }}>{`Group Name: ${autoGroupName}`}</span>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => toggleProduct(product.slug)} style={removeButtonStyle}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  <h4 style={{ margin: 0, color: "#0f172a" }}>No products selected yet</h4>
                  <p style={{ margin: 0, color: "#526377" }}>
                    Search by product name or ASIN and choose multiple products for this variant group.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={actionRowStyle}>
            <button
              type="button"
              style={{
                ...secondaryButtonStyle,
                ...(selectedProductRecords.length < 2 || !autoGroupName ? disabledButtonStyle : null)
              }}
              onClick={() => handleSave("draft")}
              disabled={selectedProductRecords.length < 2 || !autoGroupName}
            >
              Save Draft
            </button>
            <button
              type="button"
              style={{
                ...primaryButtonStyle,
                ...(selectedProductRecords.length < 2 || !autoGroupName ? disabledPrimaryButtonStyle : null)
              }}
              onClick={() => handleSave("saved")}
              disabled={selectedProductRecords.length < 2 || !autoGroupName}
            >
              Save
            </button>
            <button type="button" style={ghostButtonStyle} onClick={handleClose}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      {savedGroups.length ? (
        <section style={cardStyle}>
          <div style={selectionHeadStyle}>
            <div>
              <span style={eyebrowStyle}>Saved Groups</span>
              <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: "28px" }}>Created Variant Groups</h3>
            </div>
            <span style={miniPillStyle}>{`${savedGroups.length} Groups`}</span>
          </div>

          <div style={selectedListStyle}>
            {savedGroups.map((group) => (
              <div key={group.groupId} style={savedGroupCardStyle}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <strong style={{ color: "#0f172a" }}>{group.groupName}</strong>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Group ID: ${group.groupId}`}</span>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Variant Type: ${group.variantType}`}</span>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Products: ${(group.products || []).join(", ")}`}</span>
                </div>
                <span style={group.status === "draft" ? draftBadgeStyle : selectedBadgeStyle}>
                  {group.status === "draft" ? "Draft" : "Saved"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const heroStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f5fbf7 56%, #edf7ff 100%)",
  borderRadius: "22px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.18)",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  flexWrap: "wrap"
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)",
  padding: "20px",
  display: "grid",
  gap: "20px"
};

const sectionHeadStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px"
};

const fieldStyle = {
  display: "grid",
  gap: "8px"
};

const labelStyle = {
  color: "#0f172a",
  fontWeight: 700,
  fontSize: "14px"
};

const inputStyle = {
  width: "100%",
  minHeight: "46px",
  padding: "0 14px",
  borderRadius: "14px",
  border: "1px solid #d7e0ea",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "14px",
  outline: "none"
};

const helperStyle = {
  color: "#64748b",
  fontSize: "12px"
};

const selectionLayoutStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: "20px",
  alignItems: "start"
};

const selectionColumnStyle = {
  display: "grid",
  gap: "14px"
};

const selectionHeadStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap"
};

const subheadingStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px"
};

const pickerListStyle = {
  display: "grid",
  gap: "12px",
  maxHeight: "420px",
  overflowY: "auto",
  paddingRight: "4px"
};

const productPickerItemStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e5edf5",
  background: "#f8fafc",
  cursor: "pointer"
};

const productPickerSelectedStyle = {
  border: "1px solid rgba(15, 118, 110, 0.36)",
  background: "linear-gradient(180deg, #f0fdfa 0%, #ecfdf5 100%)"
};

const selectedListStyle = {
  display: "grid",
  gap: "12px"
};

const selectedCardStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe7f0",
  background: "#ffffff"
};

const savedGroupCardStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe7f0",
  background: "#ffffff"
};

const actionRowStyle = {
  display: "flex",
  gap: "12px",
  justifyContent: "flex-end",
  flexWrap: "wrap"
};

const feedbackBannerStyle = {
  borderRadius: "16px",
  padding: "14px 16px",
  border: "1px solid transparent",
  fontSize: "14px",
  fontWeight: 700
};

const feedbackSuccessStyle = {
  background: "#ecfdf5",
  borderColor: "#bbf7d0",
  color: "#166534"
};

const feedbackErrorStyle = {
  background: "#fef2f2",
  borderColor: "#fecaca",
  color: "#b91c1c"
};

const emptyStateStyle = {
  padding: "24px",
  borderRadius: "18px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  display: "grid",
  gap: "10px"
};

const primaryButtonStyle = {
  minHeight: "42px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid rgba(15, 118, 110, 0.18)",
  background: "linear-gradient(135deg, #0f766e 0%, #15803d 100%)",
  color: "#ffffff",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  minHeight: "42px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer"
};

const ghostButtonStyle = {
  minHeight: "42px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontWeight: 700,
  fontSize: "13px",
  cursor: "pointer"
};

const disabledButtonStyle = {
  opacity: 0.5,
  cursor: "not-allowed"
};

const disabledPrimaryButtonStyle = {
  background: "#94a3b8",
  borderColor: "#94a3b8",
  opacity: 0.65,
  cursor: "not-allowed"
};

const removeButtonStyle = {
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer"
};

const pillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #edf2f7",
  color: "#475569",
  fontWeight: 700,
  fontSize: "12px"
};

const draftBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "72px",
  minHeight: "32px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#fef3c7",
  border: "1px solid #fde68a",
  color: "#92400e",
  fontWeight: 700,
  fontSize: "12px"
};

const miniPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "28px",
  padding: "0 10px",
  borderRadius: "999px",
  background: "#eef6ff",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: "12px"
};

const addBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "72px",
  minHeight: "32px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#ffffff",
  border: "1px solid #dbe7f0",
  color: "#475569",
  fontWeight: 700,
  fontSize: "12px"
};

const selectedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "72px",
  minHeight: "32px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#dcfce7",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontWeight: 700,
  fontSize: "12px"
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};
