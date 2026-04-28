import React from "react";
import { useNavigate } from "react-router-dom";
import { deleteCategory, fetchCategories } from "../../api/adminApi";

function getPreviewUrl(url) {
  if (!url) return "/images/optimized/digital-photo-frames.webp";
  if (/^(data:|blob:|https?:)/i.test(url)) return url;
  if (url.startsWith("/uploads/")) return `http://localhost:4000${url}`;
  return url;
}

function normalizeRow(category) {
  return {
    id: category.id,
    image: category.imageUrl || category.categoryImage || "",
    categoryName: category.name || category.categoryName || "",
    parentCategory: category.parentCategory || "None",
    slug: category.slug || "",
    status: category.status === "active" ? "Active" : "Inactive",
    showInMenu: category.showInMenu ? "Yes" : "No",
    featured: category.featuredCategory ? "Yes" : "No",
    sortOrder: Number(category.sortOrder || 0)
  };
}

export default function Categories() {
  const navigate = useNavigate();
  const [categoryRows, setCategoryRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState("");

  const loadCategories = React.useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetchCategories();
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setCategoryRows(rows.map(normalizeRow));
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load categories from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleDelete = async (row) => {
    const confirmed = window.confirm(`Delete category "${row.categoryName}"?`);
    if (!confirmed) return;

    try {
      await deleteCategory(row.id);
      setCategoryRows((current) => current.filter((category) => category.id !== row.id));
      setMessage("Category deleted successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete category.");
    }
  };

  return (
    <div style={pageStyle}>
      <section style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Dashboard Module</span>
          <h2 style={titleStyle}>Categories</h2>
          <p style={copyStyle}>Manage website categories with image upload, hierarchy, storefront visibility, featured placement, and SEO control.</p>
        </div>

        <div style={headerActionsStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={loadCategories}>Refresh</button>
          <button type="button" style={addButtonStyle} onClick={() => navigate("/dashboard/categories/new")}>Add Category</button>
        </div>
      </section>

      {message ? <section style={feedbackStyle}>{message}</section> : null}

      <section style={tableCardStyle}>
        <div style={displaySettingsIntroStyle}>
          <div>
            <span style={eyebrowStyle}>Display Settings</span>
            <h3 style={displayTitleStyle}>Menu, Featured Placement & Sort Priority</h3>
            <p style={displayCopyStyle}>Categories listed here are loaded from backend. Active and featured categories appear on the frontend website according to display settings.</p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Image", "Category Name", "Parent Category", "Slug", "Status", "Show in Menu", "Featured", "Sort Order", "Actions"].map((heading) => (
                  <th key={heading} style={tableHeaderStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row) => (
                <tr key={row.id}>
                  <td style={tableCellStyle}>
                    <div style={imageCellStyle}>
                      <img src={getPreviewUrl(row.image)} alt={row.categoryName} style={imageStyle} />
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong style={{ color: "#0f172a" }}>{row.categoryName}</strong>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>{`ID ${row.id}`}</span>
                    </div>
                  </td>
                  <td style={tableCellStyle}>{row.parentCategory}</td>
                  <td style={tableCellStyle}>{row.slug}</td>
                  <td style={tableCellStyle}><span style={{ ...badgeStyle, ...(row.status === "Active" ? activeBadgeStyle : inactiveBadgeStyle) }}>{row.status}</span></td>
                  <td style={tableCellStyle}><span style={{ ...badgeStyle, ...(row.showInMenu === "Yes" ? menuBadgeStyle : neutralBadgeStyle) }}>{row.showInMenu}</span></td>
                  <td style={tableCellStyle}><span style={{ ...badgeStyle, ...(row.featured === "Yes" ? featuredBadgeStyle : neutralBadgeStyle) }}>{row.featured}</span></td>
                  <td style={tableCellStyle}>{row.sortOrder}</td>
                  <td style={tableCellStyle}>
                    <div style={actionsStyle}>
                      <button type="button" style={editButtonStyle} onClick={() => navigate(`/dashboard/categories/${row.id}/edit`)}>Edit</button>
                      <button type="button" style={deleteButtonStyle} onClick={() => handleDelete(row)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}

              {!categoryRows.length ? (
                <tr>
                  <td colSpan="9" style={{ ...tableCellStyle, textAlign: "center", color: "#64748b", padding: "30px" }}>
                    {loading ? "Loading categories..." : "No categories found. Add a category to publish it to the website."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const pageStyle = { display: "grid", gap: "16px" };

const headerStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f4fbf6 55%, #edf7ff 100%)",
  borderRadius: "16px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 10px 26px rgba(174, 203, 190, 0.14)",
  padding: "22px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const titleStyle = { margin: "8px 0 0", fontSize: "38px", color: "#0f172a" };
const copyStyle = { margin: "10px 0 0", color: "#526377", maxWidth: "760px" };
const headerActionsStyle = { display: "flex", gap: "10px", flexWrap: "wrap" };

const tableCardStyle = {
  background: "#ffffff",
  borderRadius: "14px",
  border: "1px solid rgba(203, 213, 225, 0.75)",
  boxShadow: "0 8px 22px rgba(174, 203, 190, 0.08)",
  padding: "16px"
};

const displaySettingsIntroStyle = {
  display: "grid",
  gap: "8px",
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #e5edf5",
  background: "#f8fafc"
};

const displayTitleStyle = { margin: "6px 0 0", color: "#0f172a", fontSize: "20px" };
const displayCopyStyle = { margin: "8px 0 0", color: "#64748b", lineHeight: 1.55 };

const tableStyle = { width: "100%", borderCollapse: "collapse", minWidth: "1040px" };
const tableHeaderStyle = { textAlign: "left", padding: "14px 12px", fontSize: "13px", color: "#334155", borderBottom: "1px solid #e5edf5" };
const tableCellStyle = { padding: "14px 12px", color: "#0f172a", borderBottom: "1px solid #eef2f7", verticalAlign: "middle" };

const imageCellStyle = { width: "64px", height: "64px", borderRadius: "12px", overflow: "hidden", background: "#f8fafc", border: "1px solid #e5edf5" };
const imageStyle = { width: "100%", height: "100%", objectFit: "cover", display: "block" };
const actionsStyle = { display: "flex", gap: "8px", flexWrap: "wrap" };

const badgeStyle = { display: "inline-flex", alignItems: "center", minHeight: "28px", padding: "0 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800 };
const activeBadgeStyle = { background: "#dcfce7", color: "#166534" };
const inactiveBadgeStyle = { background: "#e5e7eb", color: "#374151" };
const featuredBadgeStyle = { background: "#dbeafe", color: "#1d4ed8" };
const menuBadgeStyle = { background: "#ccfbf1", color: "#0f766e" };
const neutralBadgeStyle = { background: "#f1f5f9", color: "#475569" };

const addButtonStyle = { minHeight: "42px", padding: "0 16px", borderRadius: "9px", border: "1px solid rgba(15, 23, 42, 0.1)", background: "#16a34a", color: "#ffffff", fontWeight: 800, cursor: "pointer" };
const secondaryButtonStyle = { minHeight: "42px", padding: "0 16px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontWeight: 800, cursor: "pointer" };
const editButtonStyle = { minHeight: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", color: "#0f172a", fontWeight: 800, cursor: "pointer" };
const deleteButtonStyle = { minHeight: "34px", padding: "0 12px", borderRadius: "8px", border: "1px solid #fecaca", background: "#fff1f2", color: "#b91c1c", fontWeight: 800, cursor: "pointer" };
const feedbackStyle = { borderRadius: "12px", padding: "12px 14px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", fontWeight: 800 };
const eyebrowStyle = { color: "#0f766e", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };

