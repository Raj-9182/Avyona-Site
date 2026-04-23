import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const parentCategoryOptions = [
  { value: "", label: "None (Main Category)" },
  { value: "personal-audio", label: "Personal Audio" },
  { value: "digital-camera", label: "Digital Camera" },
  { value: "smart-devices", label: "Smart Devices" }
];

const categoryPreviewRecords = {
  "CAT-001": {
    categoryName: "Personal Audio",
    slug: "personal-audio",
    parentCategory: "",
    categoryImage: "/images/optimized/personal-audio-thumb.webp",
    bannerImage: "/images/optimized/personal-audio-banner.webp",
    showInMenu: true,
    featured: true,
    sortOrder: "1",
    status: "active",
    shortDescription: "Headphones, earbuds, and neckbands for daily listening.",
    metaTitle: "Personal Audio Collection | Avyona",
    metaDescription: "Shop personal audio products including headphones, earbuds, and neckbands.",
    keywords: "personal audio, headphones, earbuds, neckbands"
  },
  "CAT-002": {
    categoryName: "Earbuds",
    slug: "earbuds",
    parentCategory: "personal-audio",
    categoryImage: "/images/optimized/earbuds-thumb.webp",
    bannerImage: "/images/optimized/earbuds-banner.webp",
    showInMenu: true,
    featured: false,
    sortOrder: "11",
    status: "active",
    shortDescription: "Wireless and everyday earbuds under Personal Audio.",
    metaTitle: "Earbuds Collection | Avyona",
    metaDescription: "Browse earbuds under the Personal Audio collection.",
    keywords: "earbuds, wireless earbuds, personal audio"
  },
  "CAT-003": {
    categoryName: "Digital Camera",
    slug: "digital-camera",
    parentCategory: "",
    categoryImage: "/images/optimized/digital-camera-thumb.webp",
    bannerImage: "/images/optimized/digital-camera-banner.webp",
    showInMenu: true,
    featured: true,
    sortOrder: "3",
    status: "active",
    shortDescription: "Compact and creator-friendly digital cameras.",
    metaTitle: "Digital Camera Collection | Avyona",
    metaDescription: "Browse digital cameras for travel, family, and creator use.",
    keywords: "digital camera, compact camera, creator camera"
  }
};

function createSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AddCategory() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const isEditMode = Boolean(categoryId);
  const existingCategory = categoryPreviewRecords[categoryId] || null;
  const [form, setForm] = React.useState(() => ({
    categoryName: existingCategory?.categoryName || "",
    slug: existingCategory?.slug || "",
    parentCategory: existingCategory?.parentCategory || "",
    categoryImage: existingCategory?.categoryImage || "",
    bannerImage: existingCategory?.bannerImage || "",
    showInMenu: existingCategory?.showInMenu ?? true,
    featured: existingCategory?.featured ?? false,
    sortOrder: existingCategory?.sortOrder || "",
    status: existingCategory?.status || "active",
    shortDescription: existingCategory?.shortDescription || "",
    metaTitle: existingCategory?.metaTitle || "",
    metaDescription: existingCategory?.metaDescription || "",
    keywords: existingCategory?.keywords || ""
  }));
  const [slugEditedManually, setSlugEditedManually] = React.useState(Boolean(existingCategory?.slug));
  const [statusMessage, setStatusMessage] = React.useState("");

  const handleCategoryNameChange = (value) => {
    setForm((current) => ({
      ...current,
      categoryName: value,
      slug: slugEditedManually ? current.slug : createSlug(value)
    }));
  };

  const handleSlugChange = (value) => {
    setSlugEditedManually(true);
    setForm((current) => ({
      ...current,
      slug: createSlug(value)
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatusMessage(isEditMode ? "Category basic info updated locally for preview." : "New category basic info saved locally for preview.");
  };

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={heroStyle}>
        <div>
          <span style={eyebrowStyle}>Category Form</span>
          <h2 style={{ margin: "8px 0 0", fontSize: "40px", color: "#0f172a" }}>
            {isEditMode ? "Edit Category" : "Add Category"}
          </h2>
          <p style={{ margin: "12px 0 0", color: "#526377", maxWidth: "720px" }}>
            Start with the core category identity. This section defines the category name, editable slug, and
            parent-child placement in the collection hierarchy.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button" style={secondaryButtonStyle} onClick={() => navigate("/dashboard/categories")}>
            Back to Categories
          </button>
        </div>
      </section>

      {statusMessage ? <section style={feedbackStyle}>{statusMessage}</section> : null}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "20px" }}>
        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 1</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Basic Info</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Add the category name, editable URL slug, and parent category for hierarchy support.
            </p>
          </div>

          <div style={fieldGridStyle}>
            <label style={fieldStyle}>
              <span>Category Name</span>
              <input
                type="text"
                value={form.categoryName}
                onChange={(event) => handleCategoryNameChange(event.target.value)}
                placeholder="Example: Personal Audio"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => handleSlugChange(event.target.value)}
                placeholder="personal-audio"
                style={inputStyle}
              />
              <small style={helperTextStyle}>Auto-generated from category name, but still editable.</small>
            </label>
          </div>

          <label style={fieldStyle}>
            <span>Parent Category</span>
            <select
              value={form.parentCategory}
              onChange={(event) => setForm((current) => ({ ...current, parentCategory: event.target.value }))}
              style={inputStyle}
            >
              {parentCategoryOptions.map((option) => (
                <option key={option.value || "none"} value={option.value}>{option.label}</option>
              ))}
            </select>
            <small style={helperTextStyle}>Choose `None` for a main category, or select a parent to make this a subcategory.</small>
          </label>
        </section>

        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 2</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Images</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Add the main category image for cards and the banner image for the collection landing page.
            </p>
          </div>

          <div style={fieldGridStyle}>
            <label style={fieldStyle}>
              <span>Category Image</span>
              <input
                type="text"
                value={form.categoryImage}
                onChange={(event) => setForm((current) => ({ ...current, categoryImage: event.target.value }))}
                placeholder="/images/optimized/category-thumb.webp"
                style={inputStyle}
              />
              <small style={helperTextStyle}>Used on cards, admin list rows, and category previews.</small>
            </label>

            <label style={fieldStyle}>
              <span>Banner Image</span>
              <input
                type="text"
                value={form.bannerImage}
                onChange={(event) => setForm((current) => ({ ...current, bannerImage: event.target.value }))}
                placeholder="/images/optimized/category-banner.webp"
                style={inputStyle}
              />
              <small style={helperTextStyle}>Used on the storefront collection page header.</small>
            </label>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 3</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Display Settings</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Control menu visibility, featured placement, and sort priority across the storefront.
            </p>
          </div>

          <div style={fieldGridStyle}>
            <label style={toggleFieldStyle}>
              <span>Show in Menu</span>
              <input
                type="checkbox"
                checked={Boolean(form.showInMenu)}
                onChange={(event) => setForm((current) => ({ ...current, showInMenu: event.target.checked }))}
              />
            </label>

            <label style={toggleFieldStyle}>
              <span>Featured</span>
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
              />
            </label>
          </div>

          <label style={fieldStyle}>
            <span>Sort Order</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              placeholder="1"
              style={inputStyle}
            />
          </label>
        </section>

        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 4</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Status</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Decide whether this category should be active in the dashboard and storefront.
            </p>
          </div>

          <div style={fieldGridStyle}>
            <label style={statusOptionStyle}>
              <input
                type="radio"
                name="categoryStatus"
                checked={form.status === "active"}
                onChange={() => setForm((current) => ({ ...current, status: "active" }))}
              />
              <span>Active</span>
            </label>

            <label style={statusOptionStyle}>
              <input
                type="radio"
                name="categoryStatus"
                checked={form.status === "inactive"}
                onChange={() => setForm((current) => ({ ...current, status: "inactive" }))}
              />
              <span>Inactive</span>
            </label>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 5</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>Description</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Add a short collection summary for cards, collection pages, and admin previews.
            </p>
          </div>

          <label style={fieldStyle}>
            <span>Short Description</span>
            <textarea
              value={form.shortDescription}
              onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))}
              placeholder="Write a short category description"
              style={textareaStyle}
            />
          </label>
        </section>

        <section style={sectionCardStyle}>
          <div style={{ display: "grid", gap: "8px" }}>
            <span style={eyebrowStyle}>Section 6</span>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "24px" }}>SEO</h3>
            <p style={{ margin: 0, color: "#64748b" }}>
              Configure collection landing page metadata for search visibility and click-through quality.
            </p>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <label style={fieldStyle}>
              <span>Meta Title</span>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))}
                placeholder="Personal Audio Collection | Avyona"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Meta Description</span>
              <textarea
                value={form.metaDescription}
                onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))}
                placeholder="Short SEO description for the collection page"
                style={textareaStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span>Keywords</span>
              <input
                type="text"
                value={form.keywords}
                onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))}
                placeholder="keyword 1, keyword 2, keyword 3"
                style={inputStyle}
              />
            </label>
          </div>
        </section>

        <div style={actionsRowStyle}>
          <button type="button" style={secondaryButtonStyle} onClick={() => navigate("/dashboard/categories")}>
            Cancel
          </button>
          <button type="submit" style={primaryButtonStyle}>
            {isEditMode ? "Save Category" : "Create Category"}
          </button>
        </div>
      </form>
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

const sectionCardStyle = {
  background: "#ffffff",
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)",
  padding: "22px",
  display: "grid",
  gap: "18px"
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px"
};

const fieldStyle = {
  display: "grid",
  gap: "8px",
  color: "#334155",
  fontWeight: 600
};

const inputStyle = {
  width: "100%",
  minHeight: "44px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  background: "#fff",
  color: "#0f172a"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "110px",
  padding: "12px"
};

const helperTextStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 500
};

const toggleFieldStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  minHeight: "52px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700
};

const statusOptionStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "52px",
  padding: "0 14px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700
};

const actionsRowStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  flexWrap: "wrap"
};

const primaryButtonStyle = {
  minHeight: "42px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "1px solid rgba(15, 23, 42, 0.1)",
  background: "linear-gradient(135deg, #0f172a 0%, #1f4336 100%)",
  color: "#ffffff",
  fontWeight: 700,
  cursor: "pointer"
};

const secondaryButtonStyle = {
  minHeight: "42px",
  padding: "0 18px",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer"
};

const feedbackStyle = {
  borderRadius: "16px",
  padding: "14px 16px",
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontWeight: 600
};

const eyebrowStyle = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};
