import React from "react";

const categoryFields = [
  {
    title: "Basic Info",
    fields: ["Category Name", "Slug (URL)", "Parent Category"]
  },
  {
    title: "Display",
    fields: ["Category Image", "Banner Image", "Short Description"]
  },
  {
    title: "Control",
    fields: ["Status (Active / Inactive)", "Show in Menu", "Featured Category", "Sort Order"]
  },
  {
    title: "SEO",
    fields: ["Meta Title", "Meta Description", "Keywords"]
  }
];

const previewCategories = [
  {
    id: "CAT-001",
    name: "Personal Audio",
    slug: "personal-audio",
    type: "Main Category",
    parentCategory: "None",
    childCategories: 2,
    status: "Active",
    showInMenu: "Yes",
    featuredCategory: "Yes",
    sortOrder: 1,
    metaTitle: "Personal Audio Collection | Avyona"
  },
  {
    id: "CAT-002",
    name: "Earbuds",
    slug: "earbuds",
    type: "Subcategory",
    parentCategory: "Personal Audio",
    childCategories: 0,
    status: "Active",
    showInMenu: "Yes",
    featuredCategory: "No",
    sortOrder: 11,
    metaTitle: "Earbuds Collection | Avyona"
  },
  {
    id: "CAT-003",
    name: "Digital Photo Frames",
    slug: "digital-photo-frames",
    type: "Main Category",
    parentCategory: "None",
    childCategories: 0,
    status: "Active",
    showInMenu: "Yes",
    featuredCategory: "Yes",
    sortOrder: 5,
    metaTitle: "Digital Photo Frames Collection | Avyona"
  }
];

export default function Collections() {
  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Collection System</span>
          <h2 style={{ margin: "8px 0 0", fontSize: "42px", color: "#0f172a" }}>Categories</h2>
          <p style={{ margin: "12px 0 0", color: "#526377", maxWidth: "760px" }}>
            Categories are now structured as collection controllers for product grouping, collection pages, filters,
            SEO landing pages, and storefront navigation.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <span style={pillStyle}>Fields: 13</span>
          <span style={pillStyle}>Preview Categories: {previewCategories.length}</span>
          <span style={pillStyle}>Supports Parent to Child</span>
        </div>
      </section>

      <section style={cardStyle}>
        <div>
          <span style={eyebrowStyle}>Category Types</span>
          <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Main categories and subcategories</h3>
          <p style={{ margin: "12px 0 0", color: "#526377", maxWidth: "760px" }}>
            The system now supports a parent to child category hierarchy, so main categories can own focused
            subcategories for navigation, filters, SEO pages, and grouped product discovery.
          </p>
        </div>
        <div style={typeGridStyle}>
          <article style={typeCardStyle}>
            <strong style={{ color: "#0f172a" }}>Main Categories</strong>
            <p style={{ margin: "8px 0 0", color: "#526377" }}>
              Examples: Personal Audio, Digital Cameras, Smart Devices
            </p>
          </article>
          <article style={typeCardStyle}>
            <strong style={{ color: "#0f172a" }}>Subcategories</strong>
            <p style={{ margin: "8px 0 0", color: "#526377" }}>
              Examples: Earbuds, Headphones, DSLR Cameras
            </p>
          </article>
        </div>
      </section>

      <section style={gridStyle}>
        {categoryFields.map((group) => (
          <article key={group.title} style={cardStyle}>
            <h3 style={{ margin: 0, color: "#0f172a" }}>{group.title}</h3>
            <div style={{ display: "grid", gap: "10px" }}>
              {group.fields.map((field) => (
                <div key={field} style={fieldRowStyle}>
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{field}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <span style={eyebrowStyle}>Admin Preview</span>
            <h3 style={{ margin: "8px 0 0", color: "#0f172a" }}>Collection-ready category records</h3>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Category ID", "Category Name", "Type", "Slug", "Parent", "Child Categories", "Status", "Show in Menu", "Featured", "Sort Order", "Meta Title"].map((heading) => (
                  <th key={heading} style={tableHeaderStyle}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewCategories.map((category) => (
                <tr key={category.id}>
                  <td style={tableCellStyle}>{category.id}</td>
                  <td style={tableCellStyle}>{category.name}</td>
                  <td style={tableCellStyle}>{category.type}</td>
                  <td style={tableCellStyle}>{category.slug}</td>
                  <td style={tableCellStyle}>{category.parentCategory}</td>
                  <td style={tableCellStyle}>{category.childCategories}</td>
                  <td style={tableCellStyle}>
                    <span style={{ ...badgeStyle, ...(category.status === "Active" ? activeBadgeStyle : inactiveBadgeStyle) }}>
                      {category.status}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{category.showInMenu}</td>
                  <td style={tableCellStyle}>{category.featuredCategory}</td>
                  <td style={tableCellStyle}>{category.sortOrder}</td>
                  <td style={tableCellStyle}>{category.metaTitle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const heroStyle = {
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

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "20px"
};

const typeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px"
};

const typeCardStyle = {
  padding: "16px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #e5edf5"
};

const cardStyle = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)",
  padding: "20px",
  display: "grid",
  gap: "18px"
};

const fieldRowStyle = {
  padding: "12px 14px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px solid #e5edf5"
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

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "980px"
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
  verticalAlign: "top"
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
