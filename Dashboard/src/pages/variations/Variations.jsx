import React, { useEffect, useMemo, useState } from "react";
import {
  createVariantGroup,
  deleteVariantGroup,
  fetchProducts,
  fetchVariantGroups,
  updateVariantGroup
} from "../../api/adminApi";
import { allProducts as fallbackProducts } from "../../data/storefront-content";
import { canAccess } from "../../utils/accessControl";

const variantTypeOptions = ["Color", "Size", "Storage", "Material", "Bundle", "Finish"];

function getCleanGroupName(product) {
  if (!product) return "";
  return String(product.name || product.asin || "").trim();
}

function normalizeSearchValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getProductSearchText(product) {
  return [
    product.name,
    product.asin,
    product.sku,
    product.barcode,
    product.modelNumber,
    product.brand
  ].map(normalizeSearchValue).filter(Boolean).join(" ");
}

function mergeProductsByAsin(currentProducts, incomingProducts) {
  const byAsin = new Map();
  [...currentProducts, ...incomingProducts].forEach((product) => {
    const asin = String(product.asin || "").trim();
    if (asin) byAsin.set(asin, product);
  });
  return [...byAsin.values()];
}

export default function Variations() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [variantType, setVariantType] = useState("Color");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState(fallbackProducts);
  const [savedGroups, setSavedGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const canCreateVariations = canAccess("variations", "create");
  const canEditVariations = canAccess("variations", "edit");
  const canDeleteVariations = canAccess("variations", "delete");

  const catalogCount = catalogProducts.length || fallbackProducts.length;

  const filteredProducts = useMemo(() => {
    const normalized = normalizeSearchValue(searchTerm);

    return catalogProducts.filter((product) => {
      if (!normalized) return true;
      return getProductSearchText(product).includes(normalized);
    });
  }, [catalogProducts, searchTerm]);

  const selectedProductRecords = useMemo(
    () => catalogProducts.filter((product) => selectedProducts.includes(String(product.asin || ""))),
    [catalogProducts, selectedProducts]
  );
  const selectedSavedGroups = useMemo(
    () => savedGroups.filter((group) => selectedGroupIds.includes(String(group.groupId || ""))),
    [savedGroups, selectedGroupIds]
  );

  const autoGroupName = useMemo(() => {
    if (!selectedProductRecords.length) return "";
    return getCleanGroupName(selectedProductRecords[0]);
  }, [selectedProductRecords]);

  const toggleProduct = (asin) => {
    setFeedback({ type: "", message: "" });
    setSelectedProducts((current) => (
      current.includes(asin)
        ? current.filter((item) => item !== asin)
        : [...current, asin]
    ));
  };

  const resetForm = () => {
    setEditingGroupId("");
    setSearchTerm("");
    setVariantType("Color");
    setSelectedProducts([]);
  };

  const buildGroupPayload = (status) => ({
    groupName: autoGroupName || "Untitled Group",
    variantType,
    status,
    products: selectedProductRecords.map((product) => product.asin)
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        const [productsResponse, groupsResponse] = await Promise.all([
          fetchProducts({ limit: 100 }),
          fetchVariantGroups()
        ]);
        if (!isMounted) return;
        const productRows = Array.isArray(productsResponse.data?.data) ? productsResponse.data.data : [];
        const groupRows = Array.isArray(groupsResponse.data?.data) ? groupsResponse.data.data : [];

        setCatalogProducts(productRows.length ? productRows : fallbackProducts);
        setSavedGroups(groupRows);
        setFeedback({
          type: "success",
          message: groupRows.length ? "Variant groups loaded from backend." : "No backend variant groups yet."
        });
      } catch {
        if (!isMounted) return;
        setCatalogProducts(fallbackProducts);
        setFeedback({
          type: "error",
          message: "Backend data is unavailable. Static products are shown until the API is ready."
        });
      }
    }

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalized = searchTerm.trim();
    if (normalized.length < 2) return undefined;

    let isMounted = true;
    const timeoutId = window.setTimeout(async () => {
      setIsSearchingProducts(true);
      try {
        const response = await fetchProducts({ search: normalized, limit: 100 });
        if (!isMounted) return;
        const productRows = Array.isArray(response.data?.data) ? response.data.data : [];
        setCatalogProducts((current) => mergeProductsByAsin(current, productRows));
      } catch {
        if (isMounted) {
          setFeedback({
            type: "error",
            message: "Product search is temporarily unavailable. Loaded products can still be selected."
          });
        }
      } finally {
        if (isMounted) setIsSearchingProducts(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const handleSave = async (status) => {
    if (selectedProductRecords.length < 2 || !autoGroupName) {
      return;
    }

    const payload = buildGroupPayload(status);

    try {
      const response = editingGroupId
        ? await updateVariantGroup(editingGroupId, payload)
        : await createVariantGroup(payload);
      const createdGroup = response.data?.data || {
        ...payload,
        groupId: editingGroupId || `LOCAL-${Date.now()}`
      };
      setSavedGroups((current) => [createdGroup, ...current.filter((group) => group.groupId !== createdGroup.groupId)]);
      setFeedback({
        type: "success",
        message: editingGroupId
          ? "Variant group updated. The linked products will now show together on the frontend."
          : "Variant group saved. The linked products will now show together on the frontend."
      });
    } catch (error) {
      const backendMessage = error.response?.data?.message || error.message;
      setFeedback({
        type: "error",
        message: backendMessage
          ? `Variant group could not be saved. ${backendMessage}`
          : "Variant group could not be saved. Check product ASINs, login status, and backend/database availability."
      });
      return;
    }

    resetForm();
    setFormOpen(false);
  };

  const handleEdit = (group) => {
    setEditingGroupId(group.groupId || "");
    setVariantType(group.variantType || "Color");
    setSelectedProducts((group.products || []).map((asin) => String(asin)));
    setSearchTerm("");
    setFormOpen(true);
    setFeedback({ type: "", message: "" });
  };

  const handleDelete = async (group) => {
    if (!group?.groupId) return;
    const confirmed = window.confirm(`Delete variant group ${group.groupName || group.groupId}?`);
    if (!confirmed) return;

    try {
      await deleteVariantGroup(group.groupId);
      setSavedGroups((current) => current.filter((item) => item.groupId !== group.groupId));
      if (editingGroupId === group.groupId) {
        resetForm();
        setFormOpen(false);
      }
      setFeedback({
        type: "success",
        message: "Variant group deleted. Its products are no longer linked as frontend variants."
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Variant group could not be deleted. Check backend availability and login status."
      });
    }
  };

  const toggleSavedGroup = (groupId) => {
    const normalizedGroupId = String(groupId || "");
    if (!normalizedGroupId) return;
    setSelectedGroupIds((current) => (
      current.includes(normalizedGroupId)
        ? current.filter((item) => item !== normalizedGroupId)
        : [...current, normalizedGroupId]
    ));
  };

  const toggleAllSavedGroups = () => {
    const selectableGroupIds = savedGroups.map((group) => String(group.groupId || "")).filter(Boolean);
    setSelectedGroupIds((current) => (
      current.length === selectableGroupIds.length ? [] : selectableGroupIds
    ));
  };

  const handleBulkAction = async () => {
    if (!bulkAction || !selectedSavedGroups.length) return;

    const actionLabel = bulkAction === "delete" ? "delete" : `mark selected groups as ${bulkAction}`;
    if (bulkAction === "delete" && !window.confirm(`Delete ${selectedSavedGroups.length} selected variant group(s)?`)) return;

    try {
      if (bulkAction === "delete") {
        await Promise.all(selectedSavedGroups.map((group) => deleteVariantGroup(group.groupId)));
        setSavedGroups((current) => current.filter((group) => !selectedGroupIds.includes(String(group.groupId || ""))));
      } else {
        await Promise.all(selectedSavedGroups.map((group) => updateVariantGroup(group.groupId, {
          groupName: group.groupName,
          variantType: group.variantType || "Color",
          status: bulkAction,
          products: group.products || []
        })));
        setSavedGroups((current) => current.map((group) => (
          selectedGroupIds.includes(String(group.groupId || ""))
            ? { ...group, status: bulkAction }
            : group
        )));
      }

      setSelectedGroupIds([]);
      setBulkAction("");
      setFeedback({ type: "success", message: `Bulk action complete: ${actionLabel}.` });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.response?.data?.message || "Bulk action failed. Check backend availability and permissions."
      });
    }
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
            Create a variant group by choosing multiple products through product name, ASIN, or SKU search, then assign
            one shared variant type such as color, size, or storage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={pillStyle}>{`Catalog Products: ${catalogCount}`}</span>
          <span style={pillStyle}>{`Selected: ${selectedProducts.length}`}</span>
          <span style={pillStyle}>{`Groups: ${savedGroups.length}`}</span>
          {canCreateVariations || canEditVariations ? (
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => {
                if (formOpen) {
                  handleClose();
                  return;
                }
                setFormOpen(true);
              }}
            >
              {formOpen ? "Close Variant Group" : "+ Create Variant Group"}
            </button>
          ) : null}
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
              <h3 style={{ margin: "8px 0 0", color: "#0f172a", fontSize: "30px" }}>
                {editingGroupId ? "Edit Variant Group" : "Create Variant Group"}
              </h3>
              <p style={{ margin: "10px 0 0", color: "#526377", maxWidth: "760px" }}>
                Select multiple products by product name, ASIN, or SKU, then choose the variant type for the group.
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
                placeholder="Search by product name, ASIN, or SKU"
                style={inputStyle}
              />
              <small style={helperStyle}>
                {isSearchingProducts ? "Searching backend products..." : "You can search using product name, ASIN, SKU, barcode, or model number."}
              </small>
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
                  const productAsin = String(product.asin || "");
                  const isSelected = selectedProducts.includes(productAsin);

                  return (
                    <button
                      key={product.slug || product.asin}
                      type="button"
                      onClick={() => toggleProduct(productAsin)}
                      style={{
                        ...productPickerItemStyle,
                        ...(isSelected ? productPickerSelectedStyle : null)
                      }}
                    >
                      <div style={{ display: "grid", gap: "4px", textAlign: "left" }}>
                        <strong style={{ color: "#0f172a" }}>{product.name}</strong>
                        <span style={{ color: "#526377", fontSize: "13px" }}>{`ASIN: ${product.asin}`}</span>
                        {product.sku ? (
                          <span style={{ color: "#526377", fontSize: "13px" }}>{`SKU: ${product.sku}`}</span>
                        ) : null}
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
                    <div key={product.slug || product.asin} style={selectedCardStyle}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <strong style={{ color: "#0f172a" }}>{product.name}</strong>
                        <span style={{ color: "#526377", fontSize: "13px" }}>{`ASIN: ${product.asin}`}</span>
                        {product.sku ? (
                          <span style={{ color: "#526377", fontSize: "13px" }}>{`SKU: ${product.sku}`}</span>
                        ) : null}
                        <span style={{ color: "#64748b", fontSize: "13px" }}>{`Variant Type: ${variantType}`}</span>
                        {autoGroupName ? (
                          <span style={{ color: "#0f766e", fontSize: "13px", fontWeight: 700 }}>{`Group Name: ${autoGroupName}`}</span>
                        ) : null}
                      </div>
                      <button type="button" onClick={() => toggleProduct(String(product.asin || ""))} style={removeButtonStyle}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyStateStyle}>
                  <h4 style={{ margin: 0, color: "#0f172a" }}>No products selected yet</h4>
                  <p style={{ margin: 0, color: "#526377" }}>
                    Search by product name, ASIN, or SKU and choose multiple products for this variant group.
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
              {editingGroupId ? "Update" : "Save"}
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
            <div style={bulkActionBarStyle}>
              <button type="button" onClick={toggleAllSavedGroups} style={secondaryButtonStyle}>
                {selectedGroupIds.length === savedGroups.length ? "Clear Selection" : "Select All"}
              </button>
              <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)} style={bulkSelectStyle}>
                <option value="">Bulk Action</option>
                {canEditVariations ? <option value="saved">Mark Saved</option> : null}
                {canEditVariations ? <option value="draft">Mark Draft</option> : null}
                {canDeleteVariations ? <option value="delete">Delete Selected</option> : null}
              </select>
              <button
                type="button"
                onClick={handleBulkAction}
                disabled={!bulkAction || !selectedGroupIds.length}
                style={{
                  ...primaryButtonStyle,
                  ...(!bulkAction || !selectedGroupIds.length ? disabledPrimaryButtonStyle : null)
                }}
              >
                Apply
              </button>
              <span style={miniPillStyle}>{`${selectedGroupIds.length}/${savedGroups.length} Selected`}</span>
            </div>
          </div>

          <div style={selectedListStyle}>
            {savedGroups.map((group) => (
              <div key={group.groupId} style={savedGroupCardStyle}>
                <label style={checkboxWrapStyle}>
                  <input
                    type="checkbox"
                    checked={selectedGroupIds.includes(String(group.groupId || ""))}
                    onChange={() => toggleSavedGroup(group.groupId)}
                  />
                </label>
                <div style={{ display: "grid", gap: "6px" }}>
                  <strong style={{ color: "#0f172a" }}>{group.groupName}</strong>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Group ID: ${group.groupId}`}</span>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Variant Type: ${group.variantType}`}</span>
                  <span style={{ color: "#526377", fontSize: "13px" }}>{`Products: ${(group.products || []).join(", ")}`}</span>
                </div>
                <span style={group.status === "draft" ? draftBadgeStyle : selectedBadgeStyle}>
                  {group.status === "draft" ? "Draft" : "Saved"}
                </span>
                <div style={savedGroupActionStyle}>
                  {canEditVariations ? (
                    <button type="button" onClick={() => handleEdit(group)} style={secondaryButtonStyle}>
                      Edit
                    </button>
                  ) : null}
                  {canDeleteVariations ? (
                    <button type="button" onClick={() => handleDelete(group)} style={dangerButtonStyle}>
                      Delete
                    </button>
                  ) : null}
                </div>
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

const checkboxWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  borderRadius: "10px",
  border: "1px solid #dbe7f0",
  background: "#f8fafc",
  flex: "0 0 auto"
};

const bulkActionBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap"
};

const bulkSelectStyle = {
  minHeight: "42px",
  padding: "0 14px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: "13px",
  cursor: "pointer"
};

const savedGroupActionStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "nowrap",
  justifyContent: "flex-end",
  whiteSpace: "nowrap"
};

const actionRowStyle = {
  display: "flex",
  gap: "12px",
  justifyContent: "flex-end",
  flexWrap: "nowrap"
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

const dangerButtonStyle = {
  minHeight: "42px",
  padding: "0 16px",
  borderRadius: "999px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 800,
  fontSize: "13px",
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
