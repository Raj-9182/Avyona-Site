import React from "react";
import { useNavigate } from "react-router-dom";

const categoryRows = [
  {
    id: "CAT-001",
    image: "/images/optimized/personal-audio-thumb.webp",
    categoryName: "Personal Audio",
    parentCategory: "None",
    slug: "personal-audio",
    status: "Active",
    featured: "Yes",
    sortOrder: 1
  },
  {
    id: "CAT-002",
    image: "/images/optimized/earbuds-thumb.webp",
    categoryName: "Earbuds",
    parentCategory: "Personal Audio",
    slug: "earbuds",
    status: "Active",
    featured: "No",
    sortOrder: 11
  },
  {
    id: "CAT-003",
    image: "/images/optimized/digital-camera-thumb.webp",
    categoryName: "Digital Camera",
    parentCategory: "None",
    slug: "digital-camera",
    status: "Active",
    featured: "Yes",
    sortOrder: 3
  }
];

export default function Categories() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Dashboard Module</span>
          <h2 style={{ margin: "8px 0 0", fontSize: "42px", color: "#0f172a" }}>Categories</h2>
          <p style={{ margin: "12px 0 0", color: "#526377", maxWidth: "760px" }}>
            Manage collection-ready categories with hierarchy, storefront visibility, and SEO control.
          </p>
        </div>

        <button type="button" style={addButtonStyle} onClick={() => navigate("/dashboard/categories/new")}>
          + Add Category
        </button>
      </section>

      <section style={tableCardStyle}>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "Image",
                  "Category Name",
                  "Parent Category",
                  "Slug",
                  "Status",
                  "Featured",
                  "Sort Order",
                  "Actions"
                ].map((heading) => (
                  <th key={heading} style={tableHeaderStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row) => (
                <tr key={row.id}>
                  <td style={tableCellStyle}>
                    <div style={imageCellStyle}>
                      <img src={row.image} alt={row.categoryName} style={imageStyle} />
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <strong style={{ color: "#0f172a" }}>{row.categoryName}</strong>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>{row.id}</span>
                    </div>
                  </td>
                  <td style={tableCellStyle}>{row.parentCategory}</td>
                  <td style={tableCellStyle}>{row.slug}</td>
                  <td style={tableCellStyle}>
                    <span style={{ ...badgeStyle, ...(row.status === "Active" ? activeBadgeStyle : inactiveBadgeStyle) }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ ...badgeStyle, ...(row.featured === "Yes" ? featuredBadgeStyle : neutralBadgeStyle) }}>
                      {row.featured}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{row.sortOrder}</td>
                  <td style={tableCellStyle}>
                    <div style={actionsStyle}>
                      <button type="button" style={editButtonStyle} onClick={() => navigate(`/dashboard/categories/${row.id}/edit`)}>
                        Edit
                      </button>
                      <button type="button" style={deleteButtonStyle}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const headerStyle = {
  background: "linear-gradient(135deg, #ffffff 0%, #f4fbf6 55%, #edf7ff 100%)",
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

const tableCardStyle = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)",
  padding: "18px"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "1040px"
};

const tableHeaderStyle = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: "13px",
  color: "#334155",
  borderBottom: "1px solid #e5edf5"
};

const tableCellStyle = {
  padding: "14px 12px",
  color: "#0f172a",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "middle"
};

const imageCellStyle = {
  width: "60px",
  height: "60px",
  borderRadius: "14px",
  overflow: "hidden",
  background: "#f8fafc",
  border: "1px solid #e5edf5"
};

const imageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
};

const actionsStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap"
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "28px",
  padding: "0 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700
};

const activeBadgeStyle = {
  background: "#dcfce7",
  color: "#166534"
};

const inactiveBadgeStyle = {
  background: "#e5e7eb",
  color: "#374151"
};

const featuredBadgeStyle = {
  background: "#dbeafe",
  color: "#1d4ed8"
};

const neutralBadgeStyle = {
  background: "#f1f5f9",
  color: "#475569"
};

const addButtonStyle = {
  minHeight: "44px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "1px solid rgba(15, 23, 42, 0.1)",
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer"
};

const editButtonStyle = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer"
};

const deleteButtonStyle = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 700,
  cursor: "pointer"
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};
