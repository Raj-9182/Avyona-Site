import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAdminSettings, fetchCategories, updateAdminSettings, updateCategory, uploadAdminImage, uploadAdminMedia } from "../../api/adminApi";
import { compressImageFile } from "../../utils/storefront";
import { fallbackCategoryTree, flattenCategoryTree } from "../../data/category-data";
import { allProducts } from "../../data/storefront-content";
import { cloneSettings, DEFAULT_APP_SETTINGS, mergeSettings } from "../../../../shared/appSettings";

export const homepageConfigureSections = {
  "hero-banner": {
    title: "Hero Banner",
    description: "Configure the main homepage banner, media, headline, subtitle, and call-to-action."
  },
  "browse-categories": {
    title: "Browse Categories",
    description: "Configure the category cards and ordering for the homepage Browse section."
  },
  "our-products": {
    title: "Our Products",
    description: "Configure the primary product section shown on the homepage."
  },
  "best-sellers": {
    title: "Best Sellers & Trending",
    description: "Configure best-selling and trending products for homepage placement."
  },
  "new-arrivals": {
    title: "New Arrivals",
    description: "Configure latest product highlights and new arrival ordering."
  },
  "featured-brands": {
    title: "Featured Brands",
    description: "Configure brand logo cards and featured brand ordering."
  }
};

const PAGE_LINK_OPTIONS = [
  { label: "Home", value: "/" },
  { label: "All Collections", value: "/collections" },
  { label: "Offers", value: "/offers" },
  { label: "Contact Us", value: "/contact" },
  { label: "Track Order", value: "/track-order" },
  { label: "Wishlist", value: "/wishlist" },
  { label: "Search", value: "/search" },
  { label: "Personal Audio", value: "/category/personal-audio" },
  { label: "Professional Audio", value: "/category/professional-audio" },
  { label: "Digital Camera", value: "/category/digital-camera" },
  { label: "Security Camera", value: "/category/security-camera" },
  { label: "Digital Photo Frames", value: "/category/digital-photo-frames" },
  { label: "Reading Light", value: "/category/reading-light" }
];

const HERO_FONT_FAMILIES = [
  "Montserrat",
  "Poppins",
  "Inter",
  "Roboto",
  "Open Sans",
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Cinzel",
  "DM Serif Display",
  "Bebas Neue",
  "Oswald",
  "Anton",
  "League Spartan",
  "Archivo Black",
  "Raleway",
  "Lato",
  "Nunito",
  "Work Sans",
  "Quicksand"
];

export default function HomepageConfigurePage({ sectionKey }) {
  const section = homepageConfigureSections[sectionKey] || homepageConfigureSections["hero-banner"];

  if (sectionKey === "hero-banner") {
    return <HeroBannerConfigure section={section} />;
  }

  if (sectionKey === "browse-categories") {
    return <BrowseCategoriesConfigure section={section} />;
  }

  if (sectionKey === "our-products") {
    return <ProductArrangementConfigure section={section} settingsKey="ourProducts" sectionLabel="Our Products" />;
  }

  if (sectionKey === "best-sellers") {
    return <ProductArrangementConfigure section={section} settingsKey="bestSellerProducts" categorySettingsKey="bestSellerCategories" sectionLabel="Best Sellers & Trending" enableCategoryControls />;
  }

  if (sectionKey === "new-arrivals") {
    return <ProductArrangementConfigure section={section} settingsKey="newArrivalProducts" sectionLabel="New Arrivals" fallbackMode="arrivals" />;
  }

  if (sectionKey === "featured-brands") {
    return <FeaturedBrandsConfigure section={section} />;
  }

  return (
    <section className="dashboard-page-shell">
      <div style={heroStyle}>
        <span style={eyebrowStyle}>Homepage Configuration</span>
        <h2 style={titleStyle}>{section.title}</h2>
        <p style={copyStyle}>{section.description}</p>
      </div>

      <div style={panelStyle}>
        <div>
          <span style={eyebrowStyle}>Configure Section</span>
          <h3 style={panelTitleStyle}>{section.title} Settings</h3>
          <p style={panelCopyStyle}>
            This page is ready for section controls. Add content fields, product selectors, media uploads, and ordering tools here.
          </p>
        </div>

        <div style={placeholderGridStyle}>
          <div style={placeholderCardStyle}>
            <strong>Content</strong>
            <span>Titles, subtitles, labels, and display text.</span>
          </div>
          <div style={placeholderCardStyle}>
            <strong>Media</strong>
            <span>Images, banners, thumbnails, and brand visuals.</span>
          </div>
          <div style={placeholderCardStyle}>
            <strong>Visibility</strong>
            <span>Enable, disable, sort, and schedule homepage placement.</span>
          </div>
        </div>

        <Link to="/dashboard/homepage" style={backButtonStyle}>Back to Homepage Sections</Link>
      </div>
    </section>
  );
}

function normalizeCategoryRow(category) {
  const dynamicRuleJson = parseDynamicRuleJson(category.dynamicRuleJson);

  return {
    ...category,
    dynamicRuleJson,
    name: category.name || category.categoryName || "",
    imageUrl: category.imageUrl || category.image || "",
    description: category.description || "",
    status: String(category.status || "active").toLowerCase(),
    featuredCategory: Boolean(category.featuredCategory ?? category.featured),
    sortOrder: Number(category.sortOrder || 0),
    productCount: Number(category.productCount ?? category.productSlugs?.length ?? 0),
    homepageButtonText: dynamicRuleJson.homepageButtonText || "Explore Now",
    homepageButtonLink: dynamicRuleJson.homepageButtonLink || `/category/${category.slug || ""}`
  };
}

function parseDynamicRuleJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getFallbackHomepageCategories() {
  return flattenCategoryTree(fallbackCategoryTree)
    .filter((category) => !category.parentId)
    .map(normalizeCategoryRow);
}

function getCategoryKey(category) {
  return category.id ?? category.slug ?? category.name;
}

function buildCategoryPayload(category) {
  const dynamicRuleJson = {
    ...(category.dynamicRuleJson || {}),
    homepageButtonText: String(category.homepageButtonText || "Explore Now").trim(),
    homepageButtonLink: String(category.homepageButtonLink || `/category/${category.slug}`).trim()
  };

  return {
    name: category.name,
    slug: category.slug,
    parentId: category.parentId || null,
    imageUrl: category.imageUrl,
    bannerImageUrl: category.bannerImageUrl,
    description: category.description,
    status: category.status,
    showInMenu: Boolean(category.showInMenu),
    featuredCategory: Boolean(category.featuredCategory),
    dynamicRuleJson,
    sortOrder: Number(category.sortOrder || 0),
    metaTitle: category.metaTitle,
    metaDescription: category.metaDescription,
    keywords: category.keywords
  };
}

function BrowseCategoriesConfigure({ section }) {
  const navigate = useNavigate();
  const [categories, setCategories] = React.useState(getFallbackHomepageCategories);
  const [expandedCategoryId, setExpandedCategoryId] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [uploadingCategoryId, setUploadingCategoryId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [messageTone, setMessageTone] = React.useState("success");

  React.useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsLoading(true);

      try {
        const response = await fetchCategories();
        if (!isMounted) return;

        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const mainCategories = rows
          .filter((category) => !category.parentId)
          .map(normalizeCategoryRow)
          .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));

        const nextCategories = mainCategories.length ? mainCategories : getFallbackHomepageCategories();
        setCategories(nextCategories);
        const firstVisibleCategory = nextCategories.find((category) => category.featuredCategory) || nextCategories[0];
        setExpandedCategoryId(getCategoryKey(firstVisibleCategory) || "");
        setSelectedCategoryId("");
        setMessage("Categories loaded from Categories module.");
        setMessageTone("success");
      } catch {
        if (!isMounted) return;
        const nextCategories = getFallbackHomepageCategories();
        setCategories(nextCategories);
        const firstVisibleCategory = nextCategories.find((category) => category.featuredCategory) || nextCategories[0];
        setExpandedCategoryId(getCategoryKey(firstVisibleCategory) || "");
        setSelectedCategoryId("");
        setMessage("Showing default categories. Start backend and sign in as admin to save changes.");
        setMessageTone("warning");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateCategoryField = (categoryId, field, value) => {
    setCategories((current) =>
      current.map((category) =>
        getCategoryKey(category) === categoryId
          ? { ...category, [field]: field === "sortOrder" ? Number(value || 0) : value }
          : category
      )
    );
  };

  const updateCategoryFields = (categoryId, values) => {
    setCategories((current) =>
      current.map((category) =>
        getCategoryKey(category) === categoryId
          ? { ...category, ...values }
          : category
      )
    );
  };

  const handleAddHomepageCategory = () => {
    if (!selectedCategoryId) return;

    const nextSortOrder = Math.max(0, ...categories.filter((category) => category.featuredCategory).map((category) => Number(category.sortOrder || 0))) + 1;
    updateCategoryFields(selectedCategoryId, {
      featuredCategory: true,
      status: "active",
      sortOrder: nextSortOrder
    });
    setExpandedCategoryId(selectedCategoryId);
    setSelectedCategoryId("");
  };

  const handleRemoveHomepageCategory = (categoryId) => {
    updateCategoryFields(categoryId, { featuredCategory: false });
    setExpandedCategoryId((current) => (current === categoryId ? "" : current));
  };

  const moveHomepageCategory = (categoryId, direction) => {
    const visibleCategories = categories
      .filter((category) => category.featuredCategory)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
    const currentIndex = visibleCategories.findIndex((category) => getCategoryKey(category) === categoryId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= visibleCategories.length) return;

    const currentCategory = visibleCategories[currentIndex];
    const targetCategory = visibleCategories[nextIndex];
    const currentSortOrder = Number(currentCategory.sortOrder || currentIndex + 1);
    const targetSortOrder = Number(targetCategory.sortOrder || nextIndex + 1);

    setCategories((current) =>
      current.map((category) => {
        const key = getCategoryKey(category);
        if (key === getCategoryKey(currentCategory)) return { ...category, sortOrder: targetSortOrder };
        if (key === getCategoryKey(targetCategory)) return { ...category, sortOrder: currentSortOrder };
        return category;
      })
    );
  };

  const handleCategoryImageUpload = async (categoryId, file) => {
    if (!file) return;

    setUploadingCategoryId(categoryId);

    try {
      const response = await uploadAdminImage(file);
      const uploadedUrl = response.data?.data?.url || "";
      const imageUrl = uploadedUrl.startsWith("/uploads/")
        ? `http://localhost:4000${uploadedUrl}`
        : uploadedUrl;

      if (!imageUrl) throw new Error("Image upload did not return a URL");
      updateCategoryField(categoryId, "imageUrl", imageUrl);
      setMessage("Category image uploaded successfully.");
      setMessageTone("success");
    } catch {
      try {
        const compressedImage = await compressImageFile(file, 1200, 0.82);
        updateCategoryField(categoryId, "imageUrl", compressedImage);
        setMessage("Backend upload is unavailable, so the category image was added locally for preview.");
        setMessageTone("warning");
      } catch {
        setMessage("Category image could not be added. Please try a smaller image.");
        setMessageTone("warning");
      }
    } finally {
      setUploadingCategoryId("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const saved = await Promise.all(
        categories.map(async (category) => {
          const response = await updateCategory(category.id, buildCategoryPayload(category));
          return normalizeCategoryRow(response.data?.data || category);
        })
      );

      setCategories(saved.sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)));
      setMessage("Browse Categories saved. Frontend will show active homepage categories by sort order.");
      setMessageTone("success");
    } catch {
      setMessage("Updated locally only. Backend/admin login is required to persist category homepage settings.");
      setMessageTone("warning");
    } finally {
      setIsSaving(false);
    }
  };

  const homepageCategories = categories
    .filter((category) => category.featuredCategory)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  const availableCategories = categories
    .filter((category) => !category.featuredCategory)
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  const shownCount = homepageCategories.filter((category) => category.status === "active").length;

  return (
    <section className="dashboard-page-shell">
      <div style={heroStyle}>
        <span style={eyebrowStyle}>Homepage Configuration</span>
        <h2 style={titleStyle}>{section.title}</h2>
        <p style={copyStyle}>Controls the Shop by Category section using the existing Categories module.</p>
      </div>

      <div style={panelStyle}>
        <div style={actionBarStyle}>
          <div>
            <span style={eyebrowStyle}>Shop by Category</span>
            <h3 style={panelTitleStyle}>Homepage Category Display</h3>
            <p style={panelCopyStyle}>Select existing categories, decide what appears on the homepage, and arrange the display order manually.</p>
          </div>
          <div style={actionGroupStyle}>
            <span style={summaryPillStyle}>{`${shownCount} Shown`}</span>
            <span style={summaryPillStyle}>{`${homepageCategories.length} Selected`}</span>
            <button type="button" onClick={() => navigate("/dashboard/categories")} style={secondaryButtonStyle}>
              Manage Categories
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving || isLoading} style={saveButtonStyle}>
              {isSaving ? "Saving..." : "Save Browse Categories"}
            </button>
          </div>
        </div>

        {message ? (
          <div style={{ ...feedbackStyle, ...(messageTone === "warning" ? feedbackWarningStyle : feedbackSuccessStyle) }}>
            {message}
          </div>
        ) : null}

        <div style={homepageCategorySelectorStyle}>
          <div>
            <span style={eyebrowStyle}>Available Categories</span>
            <h4 style={selectorTitleStyle}>Add Existing Category to Homepage</h4>
            <p style={panelCopyStyle}>Create and manage category details from the Categories module. Use this section only for homepage visibility and arrangement.</p>
          </div>
          <div style={selectorControlsStyle}>
            <select
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
              style={inputStyle}
              disabled={!availableCategories.length}
            >
              <option value="">{availableCategories.length ? "Select category" : "All categories are already selected"}</option>
              {availableCategories.map((category) => (
                <option key={getCategoryKey(category)} value={getCategoryKey(category)}>{category.name}</option>
              ))}
            </select>
            <button type="button" onClick={handleAddHomepageCategory} disabled={!selectedCategoryId} style={saveButtonStyle}>
              Add to Homepage
            </button>
          </div>
        </div>

        <div style={categoryManageListStyle}>
          {homepageCategories.length ? homepageCategories.map((category, index) => {
            const categoryKey = getCategoryKey(category);

            return (
            <article key={categoryKey} style={categoryManageCardStyle}>
              <button
                type="button"
                onClick={() => setExpandedCategoryId((current) => (current === categoryKey ? "" : categoryKey))}
                style={categoryPreviewButtonStyle}
              >
                <img src={category.imageUrl || category.bannerImageUrl || "/images/optimized/personal-audio-category.webp"} alt="" style={categoryPreviewImageStyle} />
                <div style={categoryPreviewCopyStyle}>
                  <span style={eyebrowStyle}>Category</span>
                  <strong style={categoryPreviewCopyStyleStrong}>{category.name}</strong>
                  <span>{`${category.productCount} products | ${category.status === "active" ? "Active" : "Inactive"} | Sort ${category.sortOrder || 0}`}</span>
                </div>
              </button>

              {expandedCategoryId === categoryKey ? (
                <div style={bannerEditorStyle}>
                  <div style={homepageArrangementBarStyle}>
                    <span style={summaryPillStyle}>{`Position ${index + 1}`}</span>
                    <div style={actionGroupStyle}>
                      <button type="button" onClick={() => moveHomepageCategory(categoryKey, -1)} disabled={index === 0} style={secondaryButtonStyle}>Move Up</button>
                      <button type="button" onClick={() => moveHomepageCategory(categoryKey, 1)} disabled={index === homepageCategories.length - 1} style={secondaryButtonStyle}>Move Down</button>
                      <button type="button" onClick={() => handleRemoveHomepageCategory(categoryKey)} style={dangerButtonStyle}>Remove from Homepage</button>
                    </div>
                  </div>

                  <div style={categorySmallGridStyle}>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Sort Order</span>
                      <input
                        type="number"
                        min="0"
                        value={category.sortOrder}
                        onChange={(event) => updateCategoryField(categoryKey, "sortOrder", event.target.value)}
                        style={inputStyle}
                      />
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Status</span>
                      <div style={segmentedControlStyle}>
                        <button
                          type="button"
                          onClick={() => updateCategoryField(categoryKey, "status", "active")}
                          style={{
                            ...segmentedButtonStyle,
                            ...(category.status === "active" ? segmentedButtonActiveStyle : null)
                          }}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCategoryField(categoryKey, "status", "inactive")}
                          style={{
                            ...segmentedButtonStyle,
                            ...(category.status === "inactive" ? segmentedButtonInactiveStyle : null)
                          }}
                        >
                          Inactive
                        </button>
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}
            </article>
          );
          }) : (
            <div style={emptyHomepageCategoryStyle}>
              No categories selected for homepage yet. Choose a category above and add it to the homepage display.
            </div>
          )}
        </div>

        <Link to="/dashboard/homepage" style={backButtonStyle}>Back to Homepage Sections</Link>
      </div>
    </section>
  );
}

function getProductKey(product) {
  return String(product.asin || product.slug || product.name || "");
}

function createHomepageProductEntry(product, index) {
  return {
    id: `homepage-product-${getProductKey(product)}`,
    productAsin: product.asin || "",
    productSlug: product.slug || "",
    status: "active",
    sortOrder: index + 1,
    slotNumber: index + 1
  };
}

function getProductByHomepageEntry(entry) {
  const asin = String(entry.productAsin || "").trim();
  const slug = String(entry.productSlug || "").trim();
  return allProducts.find((product) => String(product.asin || "") === asin || String(product.slug || "") === slug) || null;
}

function normalizeHomepageProducts(settings, settingsKey = "ourProducts", fallbackProducts = allProducts.slice(0, 8)) {
  const configured = Array.isArray(settings.homepage?.[settingsKey]) ? settings.homepage[settingsKey] : [];
  const source = configured.length ? configured : fallbackProducts.map(createHomepageProductEntry);

  return source
    .map((entry, index) => {
      const product = getProductByHomepageEntry(entry);
      return {
        id: entry.id || `homepage-product-${entry.productAsin || entry.productSlug || index}`,
        productAsin: entry.productAsin || product?.asin || "",
        productSlug: entry.productSlug || product?.slug || "",
        status: String(entry.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
        sortOrder: Number(entry.sortOrder || index + 1),
        slotNumber: Number(entry.slotNumber || entry.sortOrder || index + 1)
      };
    })
    .filter((entry) => getProductByHomepageEntry(entry))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

function getProductCategoryOptions() {
  const bySlug = new Map();
  allProducts.forEach((product) => {
    const slug = String(product.collectionSlug || product.categorySlug || "").trim();
    if (!slug) return;
    bySlug.set(slug, product.category || slug);
  });
  return Array.from(bySlug.entries())
    .map(([slug, label]) => ({ slug, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getConfiguredCategorySlugs(settings, categorySettingsKey, categoryOptions) {
  const configured = settings.homepage?.[categorySettingsKey];
  return Array.isArray(configured) && configured.length
    ? configured
    : categoryOptions.map((category) => category.slug);
}

function ProductArrangementConfigure({ section, settingsKey, categorySettingsKey = "", sectionLabel, enableCategoryControls = false, fallbackMode = "" }) {
  const navigate = useNavigate();
  const [settings, setSettings] = React.useState(() => cloneSettings(DEFAULT_APP_SETTINGS));
  const fallbackProducts = fallbackMode === "arrivals"
    ? [...allProducts].sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0)).slice(0, 4)
    : settingsKey === "bestSellerProducts"
      ? allProducts.slice(0, 8)
      : allProducts.filter((product) => product.collectionSlug === "digital-photo-frames");
  const categoryOptions = React.useMemo(() => getProductCategoryOptions(), []);
  const [homepageProducts, setHomepageProducts] = React.useState(() => normalizeHomepageProducts(DEFAULT_APP_SETTINGS, settingsKey, fallbackProducts));
  const [visibleCategorySlugs, setVisibleCategorySlugs] = React.useState(() =>
    getConfiguredCategorySlugs(DEFAULT_APP_SETTINGS, categorySettingsKey, categoryOptions)
  );
  const [selectedProductAsin, setSelectedProductAsin] = React.useState("");
  const [productAsinSearch, setProductAsinSearch] = React.useState("");
  const [draggedProductId, setDraggedProductId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [messageTone, setMessageTone] = React.useState("success");

  React.useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const response = await fetchAdminSettings();
        if (!isMounted) return;

        const mergedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || {});
        setSettings(mergedSettings);
        setHomepageProducts(normalizeHomepageProducts(mergedSettings, settingsKey, fallbackProducts));
        if (enableCategoryControls) {
          setVisibleCategorySlugs(getConfiguredCategorySlugs(mergedSettings, categorySettingsKey, categoryOptions));
        }
        setMessage(`${sectionLabel} products loaded from admin settings.`);
        setMessageTone("success");
      } catch {
        if (!isMounted) return;
        const fallbackSettings = cloneSettings(DEFAULT_APP_SETTINGS);
        setSettings(fallbackSettings);
        setHomepageProducts(normalizeHomepageProducts(fallbackSettings, settingsKey, fallbackProducts));
        if (enableCategoryControls) {
          setVisibleCategorySlugs(getConfiguredCategorySlugs(fallbackSettings, categorySettingsKey, categoryOptions));
        }
        setMessage("Showing default products. Start backend and sign in as admin to save changes.");
        setMessageTone("warning");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedAsins = new Set(homepageProducts.map((entry) => String(entry.productAsin || "")));
  const availableProducts = allProducts
    .filter((product) =>
      product.asin &&
      !selectedAsins.has(String(product.asin)) &&
      (!enableCategoryControls || visibleCategorySlugs.includes(product.collectionSlug))
    )
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  const normalizedProductSearch = productAsinSearch.trim().toLowerCase();
  const filteredAvailableProducts = normalizedProductSearch
    ? availableProducts.filter((product) =>
        String(product.asin || "").toLowerCase().includes(normalizedProductSearch) ||
        String(product.name || "").toLowerCase().includes(normalizedProductSearch) ||
        String(product.brand || "").toLowerCase().includes(normalizedProductSearch)
      )
    : availableProducts;
  const activeCount = homepageProducts.filter((entry) => entry.status === "active").length;

  const updateHomepageProduct = (entryId, values) => {
    setHomepageProducts((current) =>
      current.map((entry) => entry.id === entryId ? { ...entry, ...values } : entry)
    );
  };

  const resequenceProducts = (entries) =>
    entries.map((entry, index) => ({
      ...entry,
      sortOrder: Number(entry.sortOrder || index + 1),
      slotNumber: Number(entry.slotNumber || index + 1)
    }));

  const handleAddProduct = () => {
    const product = allProducts.find((entry) => String(entry.asin || "") === selectedProductAsin);
    if (!product) return;

    const nextSlot = Math.max(0, ...homepageProducts.map((entry) => Number(entry.slotNumber || 0))) + 1;
    const nextSort = Math.max(0, ...homepageProducts.map((entry) => Number(entry.sortOrder || 0))) + 1;

    setHomepageProducts((current) => [
      ...current,
      {
        ...createHomepageProductEntry(product, nextSort - 1),
        sortOrder: nextSort,
        slotNumber: nextSlot
      }
    ]);
    setSelectedProductAsin("");
    setProductAsinSearch("");
  };

  const handleRemoveProduct = (entryId) => {
    setHomepageProducts((current) => current.filter((entry) => entry.id !== entryId));
  };

  const moveHomepageProduct = (entryId, direction) => {
    setHomepageProducts((current) => {
      const ordered = [...current].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
      const currentIndex = ordered.findIndex((entry) => entry.id === entryId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return current;

      const [entry] = ordered.splice(currentIndex, 1);
      ordered.splice(nextIndex, 0, entry);
      return ordered.map((item, index) => ({ ...item, sortOrder: index + 1, slotNumber: index + 1 }));
    });
  };

  const handleDropProduct = (targetEntryId) => {
    if (!draggedProductId || draggedProductId === targetEntryId) {
      setDraggedProductId("");
      return;
    }

    setHomepageProducts((current) => {
      const ordered = [...current].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
      const draggedIndex = ordered.findIndex((entry) => entry.id === draggedProductId);
      const targetIndex = ordered.findIndex((entry) => entry.id === targetEntryId);

      if (draggedIndex < 0 || targetIndex < 0) return current;

      const [entry] = ordered.splice(draggedIndex, 1);
      ordered.splice(targetIndex, 0, entry);
      return ordered.map((item, index) => ({ ...item, sortOrder: index + 1, slotNumber: index + 1 }));
    });
    setDraggedProductId("");
  };

  const handleSave = async () => {
    setIsSaving(true);

    const nextProducts = homepageProducts
      .map((entry, index) => ({
        id: entry.id,
        productAsin: String(entry.productAsin || "").trim(),
        productSlug: String(entry.productSlug || "").trim(),
        status: entry.status === "inactive" ? "inactive" : "active",
        sortOrder: Number(entry.sortOrder || index + 1),
        slotNumber: Number(entry.slotNumber || index + 1)
      }))
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));

    const nextSettings = mergeSettings(settings, {
      homepage: {
        ...(settings.homepage || {}),
        [settingsKey]: nextProducts,
        ...(enableCategoryControls && categorySettingsKey ? { [categorySettingsKey]: visibleCategorySlugs } : {})
      }
    });

    try {
      const response = await updateAdminSettings({ settings: nextSettings });
      const savedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || nextSettings);
      setSettings(savedSettings);
      setHomepageProducts(normalizeHomepageProducts(savedSettings, settingsKey, fallbackProducts));
      if (enableCategoryControls) {
        setVisibleCategorySlugs(savedSettings.homepage?.[categorySettingsKey] || visibleCategorySlugs);
      }
      setMessage(`${sectionLabel} saved. Frontend will show active products by slot order.`);
      setMessageTone("success");
    } catch {
      setSettings(nextSettings);
      setHomepageProducts(nextProducts);
      setMessage("Saved locally on this page only. Backend/admin login is required for frontend preview to update.");
      setMessageTone("warning");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="dashboard-page-shell">
      <div style={heroStyle}>
        <span style={eyebrowStyle}>Homepage Configuration</span>
        <h2 style={titleStyle}>{section.title}</h2>
        <p style={copyStyle}>{`Arrange products shown in the homepage ${sectionLabel} section using existing product ASIN numbers.`}</p>
      </div>

      <div style={panelStyle}>
        <div style={actionBarStyle}>
          <div>
            <span style={eyebrowStyle}>Product Arrangement</span>
            <h3 style={panelTitleStyle}>{`Homepage ${sectionLabel}`}</h3>
            <p style={panelCopyStyle}>Select available products by ASIN, control visibility, assign slot numbers, and arrange the display order.</p>
          </div>
          <div style={actionGroupStyle}>
            <span style={summaryPillStyle}>{`${activeCount} Active`}</span>
            <span style={summaryPillStyle}>{`${homepageProducts.length} Selected`}</span>
            <button type="button" onClick={() => navigate("/dashboard/products")} style={secondaryButtonStyle}>
              Manage Products
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving || isLoading} style={saveButtonStyle}>
              {isSaving ? "Saving..." : `Save ${sectionLabel}`}
            </button>
          </div>
        </div>

        {message ? (
          <div style={{ ...feedbackStyle, ...(messageTone === "warning" ? feedbackWarningStyle : feedbackSuccessStyle) }}>
            {message}
          </div>
        ) : null}

        {enableCategoryControls ? (
          <div style={categoryFilterPanelStyle}>
            <div>
              <span style={eyebrowStyle}>Showing Categories</span>
              <h4 style={selectorTitleStyle}>Control Product Categories</h4>
              <p style={panelCopyStyle}>Choose which product categories are allowed to appear in this homepage section.</p>
            </div>
            <div style={categoryFilterGridStyle}>
              {categoryOptions.map((category) => (
                <label key={category.slug} style={compactToggleStyle}>
                  <input
                    type="checkbox"
                    checked={visibleCategorySlugs.includes(category.slug)}
                    onChange={(event) => {
                      setVisibleCategorySlugs((current) =>
                        event.target.checked
                          ? Array.from(new Set([...current, category.slug]))
                          : current.filter((slug) => slug !== category.slug)
                      );
                      setSelectedProductAsin("");
                    }}
                  />
                  <span>{category.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div style={homepageCategorySelectorStyle}>
          <div>
            <span style={eyebrowStyle}>Available Products</span>
            <h4 style={selectorTitleStyle}>Add Existing Product by ASIN</h4>
            <p style={panelCopyStyle}>Create and manage product details in the Products module. This page only controls homepage placement.</p>
          </div>
          <div style={productSelectorControlsStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Search Product ASIN</span>
              <input
                value={productAsinSearch}
                onChange={(event) => {
                  setProductAsinSearch(event.target.value);
                  setSelectedProductAsin("");
                }}
                placeholder="Type ASIN number"
                style={inputStyle}
              />
            </label>
            <select
              value={selectedProductAsin}
              onChange={(event) => setSelectedProductAsin(event.target.value)}
              style={inputStyle}
              disabled={!filteredAvailableProducts.length}
            >
              <option value="">
                {availableProducts.length
                  ? filteredAvailableProducts.length
                    ? `Select product ASIN (${filteredAvailableProducts.length} found)`
                    : "No product found for this ASIN"
                  : "All products are already selected"}
              </option>
              {filteredAvailableProducts.map((product) => (
                <option key={product.asin} value={product.asin}>{`${product.asin} - ${product.name}`}</option>
              ))}
            </select>
            <button type="button" onClick={handleAddProduct} disabled={!selectedProductAsin} style={saveButtonStyle}>
              Add to Homepage
            </button>
          </div>
        </div>

        <div style={productArrangementListStyle}>
          {homepageProducts.length ? homepageProducts
            .slice()
            .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
            .map((entry, index) => {
              const product = getProductByHomepageEntry(entry);
              if (!product) return null;

              return (
                <article
                  key={entry.id}
                  draggable
                  onDragStart={() => setDraggedProductId(entry.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDropProduct(entry.id)}
                  style={{
                    ...productArrangementCardStyle,
                    ...(draggedProductId === entry.id ? productArrangementCardDraggingStyle : null)
                  }}
                >
                  <div style={dragHandleStyle}>Drag</div>
                  <img src={product.image} alt={product.name} style={productArrangementImageStyle} />
                  <div style={productArrangementContentStyle}>
                    <span style={eyebrowStyle}>{`Slot ${entry.slotNumber || index + 1}`}</span>
                    <strong style={productArrangementTitleStyle}>{product.name}</strong>
                    <span style={bannerMetaStyle}>{`ASIN: ${product.asin} | ${entry.status === "active" ? "Active" : "Inactive"}`}</span>
                  </div>
                  <div style={productArrangementControlsStyle}>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Slot Number</span>
                      <input
                        type="number"
                        min="1"
                        value={entry.slotNumber}
                        onChange={(event) => updateHomepageProduct(entry.id, { slotNumber: Number(event.target.value || 0), sortOrder: Number(event.target.value || 0) })}
                        style={inputStyle}
                      />
                    </label>
                    <div style={segmentedControlStyle}>
                      <button
                        type="button"
                        onClick={() => updateHomepageProduct(entry.id, { status: "active" })}
                        style={{
                          ...segmentedButtonStyle,
                          ...(entry.status === "active" ? segmentedButtonActiveStyle : null)
                        }}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => updateHomepageProduct(entry.id, { status: "inactive" })}
                        style={{
                          ...segmentedButtonStyle,
                          ...(entry.status === "inactive" ? segmentedButtonInactiveStyle : null)
                        }}
                      >
                        Inactive
                      </button>
                    </div>
                    <div style={productArrangementActionStyle}>
                      <button type="button" onClick={() => moveHomepageProduct(entry.id, -1)} disabled={index === 0} style={secondaryButtonStyle}>Move Up</button>
                      <button type="button" onClick={() => moveHomepageProduct(entry.id, 1)} disabled={index === homepageProducts.length - 1} style={secondaryButtonStyle}>Move Down</button>
                      <button type="button" onClick={() => handleRemoveProduct(entry.id)} style={dangerButtonStyle}>Remove</button>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div style={emptyHomepageCategoryStyle}>
                {`No products selected for homepage yet. Choose a product ASIN above and add it to the ${sectionLabel} section.`}
              </div>
            )}
        </div>

        <Link to="/dashboard/homepage" style={backButtonStyle}>Back to Homepage Sections</Link>
      </div>
    </section>
  );
}

function createDefaultBrandEntry(brand, index) {
  return {
    id: `featured-brand-${String(brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: brand,
    logoUrl: `/images/${brand}.png`,
    status: "active",
    sortOrder: index + 1
  };
}

function createEmptyBrandEntry(sortOrder) {
  return {
    id: `featured-brand-${Date.now()}`,
    name: "",
    logoUrl: "",
    status: "active",
    sortOrder
  };
}

function normalizeFeaturedBrands(settings) {
  const configured = Array.isArray(settings.homepage?.featuredBrands) ? settings.homepage.featuredBrands : [];
  const fallbackBrands = ["sony", "KODAK", "JBL", "AKG", "WYZE", "GLOCUENT"].map(createDefaultBrandEntry);
  const source = configured.length ? configured : fallbackBrands;

  return source
    .map((brand, index) => ({
      ...createEmptyBrandEntry(index + 1),
      ...brand,
      id: brand.id || `featured-brand-${String(brand.name || index).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      status: String(brand.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
      sortOrder: Number(brand.sortOrder || index + 1)
    }))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

function FeaturedBrandsConfigure({ section }) {
  const [settings, setSettings] = React.useState(() => cloneSettings(DEFAULT_APP_SETTINGS));
  const [brands, setBrands] = React.useState(() => normalizeFeaturedBrands(DEFAULT_APP_SETTINGS));
  const [expandedBrandId, setExpandedBrandId] = React.useState("");
  const [uploadingBrandId, setUploadingBrandId] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [messageTone, setMessageTone] = React.useState("success");

  React.useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const response = await fetchAdminSettings();
        if (!isMounted) return;
        const mergedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || {});
        const nextBrands = normalizeFeaturedBrands(mergedSettings);
        setSettings(mergedSettings);
        setBrands(nextBrands);
        setExpandedBrandId(nextBrands[0]?.id || "");
        setMessage("Featured brands loaded from admin settings.");
        setMessageTone("success");
      } catch {
        if (!isMounted) return;
        const fallbackSettings = cloneSettings(DEFAULT_APP_SETTINGS);
        const nextBrands = normalizeFeaturedBrands(fallbackSettings);
        setSettings(fallbackSettings);
        setBrands(nextBrands);
        setExpandedBrandId(nextBrands[0]?.id || "");
        setMessage("Showing default brands. Start backend and sign in as admin to save changes.");
        setMessageTone("warning");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateBrand = (brandId, values) => {
    setBrands((current) => current.map((brand) => brand.id === brandId ? { ...brand, ...values } : brand));
  };

  const handleAddBrand = () => {
    const nextBrand = createEmptyBrandEntry(brands.length + 1);
    setBrands((current) => [...current, nextBrand]);
    setExpandedBrandId(nextBrand.id);
  };

  const handleDeleteBrand = (brandId) => {
    setBrands((current) => current.filter((brand) => brand.id !== brandId));
    setExpandedBrandId((current) => current === brandId ? "" : current);
  };

  const moveBrand = (brandId, direction) => {
    setBrands((current) => {
      const ordered = [...current].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
      const currentIndex = ordered.findIndex((brand) => brand.id === brandId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return current;
      const [brand] = ordered.splice(currentIndex, 1);
      ordered.splice(nextIndex, 0, brand);
      return ordered.map((entry, index) => ({ ...entry, sortOrder: index + 1 }));
    });
  };

  const handleBrandLogoUpload = async (brandId, file) => {
    if (!file) return;
    setUploadingBrandId(brandId);

    try {
      const response = await uploadAdminImage(file);
      const uploadedUrl = response.data?.data?.url || "";
      const imageUrl = uploadedUrl.startsWith("/uploads/") ? `http://localhost:4000${uploadedUrl}` : uploadedUrl;
      if (!imageUrl) throw new Error("Image upload did not return a URL");
      updateBrand(brandId, { logoUrl: imageUrl });
      setMessage("Brand logo uploaded successfully.");
      setMessageTone("success");
    } catch {
      try {
        const compressedImage = await compressImageFile(file, 900, 0.82);
        updateBrand(brandId, { logoUrl: compressedImage });
        setMessage("Backend upload is unavailable, so the logo was added locally for preview.");
        setMessageTone("warning");
      } catch {
        setMessage("Brand logo could not be added. Please try a smaller image.");
        setMessageTone("warning");
      }
    } finally {
      setUploadingBrandId("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const nextBrands = brands
      .map((brand, index) => ({
        id: brand.id,
        name: String(brand.name || "").trim(),
        logoUrl: String(brand.logoUrl || "").trim(),
        status: brand.status === "inactive" ? "inactive" : "active",
        sortOrder: Number(brand.sortOrder || index + 1)
      }))
      .filter((brand) => brand.name || brand.logoUrl)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));

    const nextSettings = mergeSettings(settings, {
      homepage: {
        ...(settings.homepage || {}),
        featuredBrands: nextBrands
      }
    });

    try {
      const response = await updateAdminSettings({ settings: nextSettings });
      const savedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || nextSettings);
      setSettings(savedSettings);
      setBrands(normalizeFeaturedBrands(savedSettings));
      setMessage("Featured brands saved. Frontend will show active brand logos by sort order.");
      setMessageTone("success");
    } catch {
      setSettings(nextSettings);
      setBrands(nextBrands);
      setMessage("Saved locally on this page only. Backend/admin login is required for frontend preview to update.");
      setMessageTone("warning");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = brands.filter((brand) => brand.status === "active").length;

  return (
    <section className="dashboard-page-shell">
      <div style={heroStyle}>
        <span style={eyebrowStyle}>Homepage Configuration</span>
        <h2 style={titleStyle}>{section.title}</h2>
        <p style={copyStyle}>Arrange and manage brand logo icons shown in the homepage Featured Brands section.</p>
      </div>

      <div style={panelStyle}>
        <div style={actionBarStyle}>
          <div>
            <span style={eyebrowStyle}>Brand Logos</span>
            <h3 style={panelTitleStyle}>Featured Brand Management</h3>
            <p style={panelCopyStyle}>Upload, edit, arrange, activate, deactivate, add, and delete brand logo icons.</p>
          </div>
          <div style={actionGroupStyle}>
            <span style={summaryPillStyle}>{`${activeCount} Active`}</span>
            <span style={summaryPillStyle}>{`${brands.length} Total`}</span>
            <button type="button" onClick={handleAddBrand} style={secondaryButtonStyle}>Add New Brand</button>
            <button type="button" onClick={handleSave} disabled={isSaving || isLoading} style={saveButtonStyle}>
              {isSaving ? "Saving..." : "Save Featured Brands"}
            </button>
          </div>
        </div>

        {message ? (
          <div style={{ ...feedbackStyle, ...(messageTone === "warning" ? feedbackWarningStyle : feedbackSuccessStyle) }}>
            {message}
          </div>
        ) : null}

        <div style={brandListStyle}>
          {brands.map((brand, index) => (
            <article key={brand.id} style={brandCardStyle}>
              <button type="button" onClick={() => setExpandedBrandId((current) => current === brand.id ? "" : brand.id)} style={brandPreviewButtonStyle}>
                <span style={brandLogoPreviewStyle}>
                  {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.name || "Brand logo"} style={brandLogoImageStyle} /> : "Logo"}
                </span>
                <span style={brandPreviewCopyStyle}>
                  <span style={eyebrowStyle}>{`Brand ${index + 1}`}</span>
                  <strong style={brandPreviewTitleStyle}>{brand.name || "Untitled Brand"}</strong>
                  <span style={bannerMetaStyle}>{`${brand.status === "active" ? "Active" : "Inactive"} | Sort ${brand.sortOrder || index + 1}`}</span>
                </span>
              </button>

              {expandedBrandId === brand.id ? (
                <div style={brandEditorStyle}>
                  <ImageUploadField
                    label="Brand Logo Icon"
                    imageUrl={brand.logoUrl}
                    isUploading={uploadingBrandId === brand.id}
                    onUpload={(file) => handleBrandLogoUpload(brand.id, file)}
                  />
                  <div style={brandEditorGridStyle}>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Brand Name</span>
                      <input value={brand.name} onChange={(event) => updateBrand(brand.id, { name: event.target.value })} placeholder="Sony" style={inputStyle} />
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Logo Image URL</span>
                      <input value={brand.logoUrl} onChange={(event) => updateBrand(brand.id, { logoUrl: event.target.value })} placeholder="/images/brand.png" style={inputStyle} />
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Sort Order</span>
                      <input type="number" min="1" value={brand.sortOrder} onChange={(event) => updateBrand(brand.id, { sortOrder: Number(event.target.value || 0) })} style={inputStyle} />
                    </label>
                    <label style={fieldStyle}>
                      <span style={labelStyle}>Status</span>
                      <div style={segmentedControlStyle}>
                        <button type="button" onClick={() => updateBrand(brand.id, { status: "active" })} style={{ ...segmentedButtonStyle, ...(brand.status === "active" ? segmentedButtonActiveStyle : null) }}>Active</button>
                        <button type="button" onClick={() => updateBrand(brand.id, { status: "inactive" })} style={{ ...segmentedButtonStyle, ...(brand.status === "inactive" ? segmentedButtonInactiveStyle : null) }}>Inactive</button>
                      </div>
                    </label>
                  </div>
                  <div style={homepageArrangementBarStyle}>
                    <span style={summaryPillStyle}>{`Position ${index + 1}`}</span>
                    <div style={actionGroupStyle}>
                      <button type="button" onClick={() => moveBrand(brand.id, -1)} disabled={index === 0} style={secondaryButtonStyle}>Move Up</button>
                      <button type="button" onClick={() => moveBrand(brand.id, 1)} disabled={index === brands.length - 1} style={secondaryButtonStyle}>Move Down</button>
                      <button type="button" onClick={() => setExpandedBrandId("")} style={secondaryButtonStyle}>Edit Done</button>
                      <button type="button" onClick={() => handleDeleteBrand(brand.id)} style={dangerButtonStyle}>Delete</button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <Link to="/dashboard/homepage" style={backButtonStyle}>Back to Homepage Sections</Link>
      </div>
    </section>
  );
}

function createEmptyBanner() {
  return {
    id: `hero-${Date.now()}`,
    mediaType: "image",
    desktopImage: "",
    mobileImage: "",
    desktopVideo: "",
    mobileVideo: "",
    altText: "",
    title: "",
    subtitle: "",
    textEnabled: true,
    titleFontSize: 56,
    subtitleFontSize: 17,
    fontFamily: "Montserrat",
    fontStyle: "normal",
    fontWeight: "800",
    ctaEnabled: true,
    buttonText: "Shop Now",
    buttonLink: "/collections",
    status: "active",
    sortOrder: 1
  };
}

function getHeroSettings(settings) {
  return {
    globalCtaEnabled: Boolean(settings.homepage?.globalHeroCta?.enabled),
    globalCtaText: settings.homepage?.globalHeroCta?.buttonText || "Shop Now",
    globalCtaLink: settings.homepage?.globalHeroCta?.buttonLink || "/collections"
  };
}

function inferMediaType(banner) {
  if (banner.mediaType === "video" || banner.desktopVideo || banner.mobileVideo) return "video";
  return "image";
}

function normalizeBanners(settings) {
  return (settings.homepage?.heroBanners || [])
    .map((banner, index) => ({
      ...createEmptyBanner(),
      ...banner,
      id: banner.id || `hero-${Date.now()}-${index}`,
      mediaType: inferMediaType(banner),
      status: banner.status || "active",
      sortOrder: Number(banner.sortOrder || index + 1),
      titleFontSize: Number(banner.titleFontSize || 56),
      subtitleFontSize: Number(banner.subtitleFontSize || 17),
      fontFamily: banner.fontFamily || "Montserrat",
      fontStyle: banner.fontStyle || "normal",
      ctaEnabled: banner.ctaEnabled !== false,
      textEnabled: banner.textEnabled !== false
    }))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
}

function getFontStyleValue(banner) {
  return `${banner.fontFamily || "Montserrat"}|${banner.fontStyle || "normal"}`;
}

function getFontStyleParts(value) {
  const [fontFamily = "Montserrat", fontStyle = "normal"] = String(value || "").split("|");
  return { fontFamily, fontStyle };
}

function HeroBannerConfigure({ section }) {
  const [settings, setSettings] = React.useState(() => cloneSettings(DEFAULT_APP_SETTINGS));
  const [banners, setBanners] = React.useState(() => normalizeBanners(DEFAULT_APP_SETTINGS));
  const [globalHeroCta, setGlobalHeroCta] = React.useState(() => getHeroSettings(DEFAULT_APP_SETTINGS));
  const [expandedBannerId, setExpandedBannerId] = React.useState("");
  const [uploadingField, setUploadingField] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [messageTone, setMessageTone] = React.useState("success");

  React.useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const response = await fetchAdminSettings();
        if (!isMounted) return;

        const mergedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || {});
        const nextBanners = normalizeBanners(mergedSettings);
        setSettings(mergedSettings);
        setBanners(nextBanners);
        setGlobalHeroCta(getHeroSettings(mergedSettings));
        setExpandedBannerId(nextBanners[0]?.id || "");
        setMessage("Hero banners loaded from backend.");
        setMessageTone("success");
      } catch {
        if (!isMounted) return;
        const fallbackSettings = cloneSettings(DEFAULT_APP_SETTINGS);
        const nextBanners = normalizeBanners(fallbackSettings);
        setSettings(fallbackSettings);
        setBanners(nextBanners);
        setGlobalHeroCta(getHeroSettings(fallbackSettings));
        setExpandedBannerId(nextBanners[0]?.id || "");
        setMessage("Showing default banner setup. Sign in as admin and keep backend running to save changes.");
        setMessageTone("warning");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateBanner = (bannerId, field, value) => {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === bannerId
          ? { ...banner, [field]: ["sortOrder", "titleFontSize", "subtitleFontSize"].includes(field) ? Number(value || 0) : value }
          : banner
      )
    );
  };

  const updateBannerFields = (bannerId, values) => {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === bannerId
          ? { ...banner, ...values }
          : banner
      )
    );
  };

  const updateBannerMediaType = (bannerId, mediaType) => {
    updateBannerFields(bannerId, { mediaType });
  };

  const updateBannerFontStyle = (bannerId, value) => {
    updateBannerFields(bannerId, getFontStyleParts(value));
  };

  const handleAddBanner = () => {
    const nextBanner = {
        ...createEmptyBanner(),
        id: `hero-${Date.now()}`,
      sortOrder: banners.length + 1
    };

    setBanners((current) => [...current, nextBanner]);
    setExpandedBannerId(nextBanner.id);
  };

  const handleRemoveBanner = (bannerId) => {
    setBanners((current) => current.filter((banner) => banner.id !== bannerId));
    setExpandedBannerId((current) => (current === bannerId ? "" : current));
  };

  const handleMediaUpload = async (bannerId, field, file) => {
    if (!file) return;

    const uploadKey = `${bannerId}:${field}`;
    setUploadingField(uploadKey);
    const isVideo = file.type.startsWith("video/");

    try {
      const response = isVideo ? await uploadAdminMedia(file) : await uploadAdminImage(file);
      const uploadedUrl = response.data?.data?.url || "";
      const mediaUrl = uploadedUrl.startsWith("/uploads/")
        ? `http://localhost:4000${uploadedUrl}`
        : uploadedUrl;

      if (!mediaUrl) throw new Error("Media upload did not return a URL");
      updateBanner(bannerId, field, mediaUrl);
      if (isVideo) updateBanner(bannerId, "mediaType", "video");
      setMessage(`${isVideo ? "Video" : "Image"} uploaded successfully.`);
      setMessageTone("success");
    } catch {
      try {
        const previewUrl = isVideo ? URL.createObjectURL(file) : await compressImageFile(file, 1600, 0.82);
        updateBanner(bannerId, field, previewUrl);
        if (isVideo) updateBanner(bannerId, "mediaType", "video");
        setMessage(`Backend upload is unavailable, so the ${isVideo ? "video" : "image"} was added locally for preview.`);
        setMessageTone("warning");
      } catch {
        setMessage("Media could not be added. Please try a smaller file.");
        setMessageTone("warning");
      }
    } finally {
      setUploadingField("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const nextBanners = banners
      .map((banner, index) => ({
        ...banner,
        title: String(banner.title || "").trim(),
        subtitle: String(banner.subtitle || "").trim(),
        altText: String(banner.altText || "").trim(),
        buttonText: String(banner.buttonText || "").trim(),
        buttonLink: String(banner.buttonLink || "").trim() || "/collections",
        titleFontSize: Number(banner.titleFontSize || 56),
        subtitleFontSize: Number(banner.subtitleFontSize || 17),
        fontFamily: String(banner.fontFamily || "Montserrat").trim(),
        fontStyle: String(banner.fontStyle || "normal").trim(),
        sortOrder: Number(banner.sortOrder || index + 1)
      }))
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));

    const nextSettings = mergeSettings(settings, {
      homepage: {
        ...(settings.homepage || {}),
        heroBanners: nextBanners,
        globalHeroCta: {
          enabled: Boolean(globalHeroCta.globalCtaEnabled),
          buttonText: String(globalHeroCta.globalCtaText || "").trim() || "Shop Now",
          buttonLink: String(globalHeroCta.globalCtaLink || "").trim() || "/collections"
        }
      }
    });

    try {
      const response = await updateAdminSettings({ settings: nextSettings });
      const savedSettings = mergeSettings(DEFAULT_APP_SETTINGS, response.data?.data || nextSettings);
      setSettings(savedSettings);
      setBanners(normalizeBanners(savedSettings));
      setGlobalHeroCta(getHeroSettings(savedSettings));
      setMessage("Hero banners saved. Frontend will show active banners sorted by sort order.");
      setMessageTone("success");
    } catch {
      setSettings(nextSettings);
      setBanners(nextBanners);
      setMessage("Saved locally on this page only. Backend/admin login is required for frontend preview to update.");
      setMessageTone("warning");
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = banners.filter((banner) => banner.status === "active").length;

  return (
    <section className="dashboard-page-shell">
      <div style={heroStyle}>
        <span style={eyebrowStyle}>Homepage Configuration</span>
        <h2 style={titleStyle}>{section.title}</h2>
        <p style={copyStyle}>{section.description}</p>
      </div>

      <div style={panelStyle}>
        <div style={actionBarStyle}>
          <div>
            <span style={eyebrowStyle}>Hero Slider</span>
            <h3 style={panelTitleStyle}>Banner Management</h3>
            <p style={panelCopyStyle}>Controls the big slider on top of the frontend homepage.</p>
          </div>
          <div style={actionGroupStyle}>
            <span style={summaryPillStyle}>{`${activeCount} Active`}</span>
            <span style={summaryPillStyle}>{`${banners.length} Total`}</span>
            <button type="button" onClick={handleAddBanner} style={secondaryButtonStyle}>Add Banner</button>
            <button type="button" onClick={handleSave} disabled={isSaving || isLoading} style={saveButtonStyle}>
              {isSaving ? "Saving..." : "Save Hero Banner"}
            </button>
          </div>
        </div>

        {message ? (
          <div style={{ ...feedbackStyle, ...(messageTone === "warning" ? feedbackWarningStyle : feedbackSuccessStyle) }}>
            {message}
          </div>
        ) : null}

        <div style={globalCtaPanelStyle}>
          <label style={compactToggleStyle}>
            <input
              type="checkbox"
              checked={globalHeroCta.globalCtaEnabled}
              onChange={(event) => setGlobalHeroCta((current) => ({ ...current, globalCtaEnabled: event.target.checked }))}
            />
            <span>Enable one CTA button for all slides</span>
          </label>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={labelStyle}>All Slide Button Text</span>
              <input
                value={globalHeroCta.globalCtaText}
                onChange={(event) => setGlobalHeroCta((current) => ({ ...current, globalCtaText: event.target.value }))}
                placeholder="Shop Now"
                style={inputStyle}
              />
            </label>
            <PageLinkPicker
              label="All Slide Button URL"
              value={globalHeroCta.globalCtaLink}
              options={PAGE_LINK_OPTIONS}
              onChange={(value) => setGlobalHeroCta((current) => ({ ...current, globalCtaLink: value }))}
            />
          </div>
        </div>

        <div style={bannerListStyle}>
          {banners.map((banner, index) => (
            <article key={banner.id} style={bannerCardStyle}>
              <button
                type="button"
                onClick={() => setExpandedBannerId((current) => (current === banner.id ? "" : banner.id))}
                style={bannerPreviewButtonStyle}
              >
                <HeroMediaPreview banner={banner} compact />
                <div style={bannerPreviewContentStyle}>
                  <span style={eyebrowStyle}>{`Banner ${index + 1}`}</span>
                  <strong style={bannerPreviewTitleStyle}>{banner.title || "Untitled Banner"}</strong>
                  <span style={bannerMetaStyle}>{`${banner.status === "active" ? "Active" : "Inactive"} | ${banner.mediaType === "video" ? "Video" : "Image"} | Sort ${banner.sortOrder || index + 1}`}</span>
                </div>
              </button>

              {expandedBannerId === banner.id ? (
                <div style={bannerEditorStyle}>
                  <div style={bannerCardHeaderStyle}>
                    <div>
                      <h4 style={bannerTitleStyle}>Banner Details</h4>
                      <p style={panelCopyStyle}>Upload desktop/mobile images or videos, review the media, and manage text, CTA, status, and ordering.</p>
                    </div>
                    <div style={actionGroupStyle}>
                      <button type="button" onClick={() => setExpandedBannerId("")} style={secondaryButtonStyle}>Edit Done</button>
                      <button type="button" onClick={() => handleRemoveBanner(banner.id)} style={dangerButtonStyle}>Delete</button>
                    </div>
                  </div>

                  <HeroMediaPreview banner={banner} />

                  <div style={editorSectionsGridStyle}>
                    <div style={mediaTypePanelStyle}>
                      <h5 style={editorSectionTitleStyle}>Media Upload</h5>
                      <label style={fieldStyle}>
                        <span style={labelStyle}>Media Type</span>
                        <select value={banner.mediaType} onChange={(event) => updateBannerMediaType(banner.id, event.target.value)} style={inputStyle}>
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>
                      <div style={uploadGridStyle}>
                        <MediaUploadField
                          label={banner.mediaType === "video" ? "Desktop Banner Video" : "Desktop Banner Image"}
                          accept={banner.mediaType === "video" ? "video/*" : "image/*"}
                          mediaUrl={banner.mediaType === "video" ? banner.desktopVideo : banner.desktopImage}
                          mediaType={banner.mediaType}
                          isUploading={uploadingField === `${banner.id}:${banner.mediaType === "video" ? "desktopVideo" : "desktopImage"}`}
                          onUpload={(file) => handleMediaUpload(banner.id, banner.mediaType === "video" ? "desktopVideo" : "desktopImage", file)}
                        />
                        <MediaUploadField
                          label={banner.mediaType === "video" ? "Mobile Banner Video" : "Mobile Banner Image"}
                          accept={banner.mediaType === "video" ? "video/*" : "image/*"}
                          mediaUrl={banner.mediaType === "video" ? banner.mobileVideo : banner.mobileImage}
                          mediaType={banner.mediaType}
                          isUploading={uploadingField === `${banner.id}:${banner.mediaType === "video" ? "mobileVideo" : "mobileImage"}`}
                          onUpload={(file) => handleMediaUpload(banner.id, banner.mediaType === "video" ? "mobileVideo" : "mobileImage", file)}
                        />
                      </div>
                    </div>

                    <div style={editorSectionStyle}>
                      <h5 style={editorSectionTitleStyle}>Media Details</h5>
                      <div style={compactSectionGridStyle}>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Alt Text</span>
                          <input value={banner.altText} onChange={(event) => updateBanner(banner.id, "altText", event.target.value)} placeholder="Describe the banner media" style={inputStyle} />
                        </label>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>{banner.mediaType === "video" ? "Desktop Video URL" : "Desktop Image URL"}</span>
                          <input
                            value={banner.mediaType === "video" ? banner.desktopVideo : banner.desktopImage}
                            onChange={(event) => updateBanner(banner.id, banner.mediaType === "video" ? "desktopVideo" : "desktopImage", event.target.value)}
                            placeholder={banner.mediaType === "video" ? "/uploads/banner-video.mp4" : "/images/optimized/banner-1.webp"}
                            style={inputStyle}
                          />
                        </label>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>{banner.mediaType === "video" ? "Mobile Video URL" : "Mobile Image URL"}</span>
                          <input
                            value={banner.mediaType === "video" ? banner.mobileVideo : banner.mobileImage}
                            onChange={(event) => updateBanner(banner.id, banner.mediaType === "video" ? "mobileVideo" : "mobileImage", event.target.value)}
                            placeholder={banner.mediaType === "video" ? "/uploads/banner-mobile-video.mp4" : "/images/optimized/banner-1.webp"}
                            style={inputStyle}
                          />
                        </label>
                      </div>
                    </div>

                    <div style={editorSectionStyle}>
                      <h5 style={editorSectionTitleStyle}>Slide Text</h5>
                      <div style={compactSectionGridStyle}>
                        <div style={fieldStyle}>
                          <span style={labelStyle}>Slide Text Status</span>
                          <label style={compactToggleStyle}>
                            <input
                              type="checkbox"
                              checked={banner.textEnabled}
                              onChange={(event) => updateBanner(banner.id, "textEnabled", event.target.checked)}
                            />
                            <span>Enable slide text</span>
                          </label>
                        </div>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Title</span>
                          <input value={banner.title} onChange={(event) => updateBanner(banner.id, "title", event.target.value)} placeholder="Banner title" style={inputStyle} />
                        </label>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Subtitle</span>
                          <textarea value={banner.subtitle} onChange={(event) => updateBanner(banner.id, "subtitle", event.target.value)} placeholder="Banner subtitle" rows={2} style={textareaStyle} />
                        </label>
                      </div>
                    </div>

                    <div style={editorSectionStyle}>
                      <h5 style={editorSectionTitleStyle}>Typography</h5>
                      <div style={compactSectionGridStyle}>
                        <div style={pairedFieldGridStyle}>
                          <label style={fieldStyle}>
                            <span style={labelStyle}>Title Size</span>
                            <input type="number" min="20" max="96" value={banner.titleFontSize} onChange={(event) => updateBanner(banner.id, "titleFontSize", event.target.value)} style={inputStyle} />
                          </label>
                          <label style={fieldStyle}>
                            <span style={labelStyle}>Subtitle Size</span>
                            <input type="number" min="12" max="40" value={banner.subtitleFontSize} onChange={(event) => updateBanner(banner.id, "subtitleFontSize", event.target.value)} style={inputStyle} />
                          </label>
                        </div>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Font Style</span>
                          <select value={getFontStyleValue(banner)} onChange={(event) => updateBannerFontStyle(banner.id, event.target.value)} style={inputStyle}>
                            {HERO_FONT_FAMILIES.flatMap((fontFamily) => [
                              <option key={`${fontFamily}-normal`} value={`${fontFamily}|normal`}>{`${fontFamily} - Normal`}</option>,
                              <option key={`${fontFamily}-italic`} value={`${fontFamily}|italic`}>{`${fontFamily} - Italic`}</option>
                            ])}
                          </select>
                        </label>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Font Weight</span>
                          <select value={banner.fontWeight} onChange={(event) => updateBanner(banner.id, "fontWeight", event.target.value)} style={inputStyle}>
                            <option value="500">Medium</option>
                            <option value="700">Bold</option>
                            <option value="800">Extra Bold</option>
                          </select>
                        </label>
                      </div>
                    </div>

                    <div style={editorSectionStyle}>
                      <h5 style={editorSectionTitleStyle}>CTA Button</h5>
                      <div style={compactSectionGridStyle}>
                        <div style={fieldStyle}>
                          <span style={labelStyle}>CTA Status</span>
                          <label style={compactToggleStyle}>
                            <input
                              type="checkbox"
                              checked={banner.ctaEnabled}
                              disabled={globalHeroCta.globalCtaEnabled}
                              onChange={(event) => updateBanner(banner.id, "ctaEnabled", event.target.checked)}
                            />
                            <span>{globalHeroCta.globalCtaEnabled ? "Disabled by all-slide CTA" : "Enable this slide CTA"}</span>
                          </label>
                        </div>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Button Text</span>
                          <input value={banner.buttonText} disabled={globalHeroCta.globalCtaEnabled} onChange={(event) => updateBanner(banner.id, "buttonText", event.target.value)} placeholder="Shop Now" style={inputStyle} />
                        </label>
                        <PageLinkPicker
                          label="Button Link"
                          value={banner.buttonLink}
                          options={PAGE_LINK_OPTIONS}
                          onChange={(value) => updateBanner(banner.id, "buttonLink", value)}
                          disabled={globalHeroCta.globalCtaEnabled}
                        />
                      </div>
                    </div>

                    <div style={editorSectionStyle}>
                      <h5 style={editorSectionTitleStyle}>Publishing</h5>
                      <div style={compactSectionGridStyle}>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Status</span>
                          <select value={banner.status} onChange={(event) => updateBanner(banner.id, "status", event.target.value)} style={inputStyle}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </label>
                        <label style={fieldStyle}>
                          <span style={labelStyle}>Sort Order</span>
                          <input type="number" min="1" value={banner.sortOrder} onChange={(event) => updateBanner(banner.id, "sortOrder", event.target.value)} style={inputStyle} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <Link to="/dashboard/homepage" style={backButtonStyle}>Back to Homepage Sections</Link>
      </div>
    </section>
  );
}

function getBannerPreviewUrl(banner) {
  if (banner.mediaType === "video") {
    return banner.desktopVideo || banner.mobileVideo || banner.desktopImage || banner.mobileImage || "";
  }
  return banner.desktopImage || banner.mobileImage || banner.desktopVideo || banner.mobileVideo || "";
}

function HeroMediaPreview({ banner, compact = false }) {
  const previewUrl = getBannerPreviewUrl(banner);
  const isVideo = banner.mediaType === "video" && (banner.desktopVideo || banner.mobileVideo);

  if (compact) {
    return isVideo ? (
      <video src={previewUrl} style={bannerPreviewThumbStyle} muted playsInline />
    ) : (
      <img src={previewUrl || "/images/optimized/banner-1.webp"} alt="" style={bannerPreviewThumbStyle} />
    );
  }

  return (
    <div style={heroReviewStyle}>
      <div style={heroReviewMediaStyle}>
        {previewUrl ? (
          isVideo ? (
            <video src={previewUrl} controls muted playsInline style={heroReviewMediaElementStyle} />
          ) : (
            <img src={previewUrl} alt={banner.altText || banner.title || "Hero banner preview"} style={heroReviewMediaElementStyle} />
          )
        ) : (
          <span style={uploadPlaceholderStyle}>No media selected yet</span>
        )}
      </div>
      <div style={heroReviewCopyStyle}>
        <span style={eyebrowStyle}>Review</span>
        <strong>{banner.title || "Untitled slide"}</strong>
        <span>{banner.mediaType === "video" ? "Video slide" : "Image slide"}</span>
        <span>{banner.altText ? `Alt: ${banner.altText}` : "Alt text not set"}</span>
      </div>
    </div>
  );
}

function MediaUploadField({ label, mediaUrl, mediaType, accept, isUploading, onUpload }) {
  const inputId = React.useId();
  const [mediaFailed, setMediaFailed] = React.useState(false);

  React.useEffect(() => {
    setMediaFailed(false);
  }, [mediaUrl]);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  const noun = mediaType === "video" ? "video" : "image";

  return (
    <label
      htmlFor={inputId}
      style={uploadDropzoneStyle}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={(event) => handleFiles(event.target.files)}
        style={fileInputStyle}
      />
      <span style={labelStyle}>{label}</span>
      <span style={uploadPreviewShellStyle}>
        {mediaUrl && !mediaFailed ? (
          mediaType === "video" ? (
            <video src={mediaUrl} style={uploadPreviewImageStyle} muted playsInline onError={() => setMediaFailed(true)} />
          ) : (
            <img src={mediaUrl} alt="" style={uploadPreviewImageStyle} onError={() => setMediaFailed(true)} />
          )
        ) : (
          <span style={uploadPlaceholderStyle}>Choose {noun}</span>
        )}
      </span>
      <strong style={uploadTitleStyle}>{isUploading ? `Adding ${noun}...` : `Drag ${noun}s here`}</strong>
      <span style={uploadHelpStyle}>or click to upload {noun} files</span>
    </label>
  );
}

function ImageUploadField({ label, imageUrl, isUploading, onUpload }) {
  const inputId = React.useId();
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file) onUpload(file);
  };

  return (
    <label
      htmlFor={inputId}
      style={uploadDropzoneStyle}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={(event) => handleFiles(event.target.files)}
        style={fileInputStyle}
      />
      <span style={labelStyle}>{label}</span>
      <span style={uploadPreviewShellStyle}>
        {imageUrl && !imageFailed ? (
          <img src={imageUrl} alt="" style={uploadPreviewImageStyle} onError={() => setImageFailed(true)} />
        ) : (
          <span style={uploadPlaceholderStyle}>Choose image</span>
        )}
      </span>
      <strong style={uploadTitleStyle}>{isUploading ? "Adding image..." : "Drag and drop image here"}</strong>
      <span style={uploadHelpStyle}>or click to choose image</span>
    </label>
  );
}

function PageLinkPicker({ label, value, options, onChange, disabled = false, fieldStyleOverride = null }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div style={{ ...fieldStyle, ...(fieldStyleOverride || null) }}>
      <span style={labelStyle}>{label}</span>
      <div style={linkPickerShellStyle}>
        <button type="button" disabled={disabled} onClick={() => setIsOpen((current) => !current)} style={{ ...linkPickerButtonStyle, ...(disabled ? disabledControlStyle : null) }}>
          <span>{selectedOption?.label || value || "Select page"}</span>
          <small>{value || "/"}</small>
        </button>
        {isOpen ? (
          <div style={linkPickerMenuStyle}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search page"
              style={linkPickerSearchStyle}
            />
            <div style={linkPickerOptionsStyle}>
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  style={{
                    ...linkPickerOptionStyle,
                    ...(option.value === value ? linkPickerOptionActiveStyle : null)
                  }}
                >
                  <strong>{option.label}</strong>
                  <span>{option.value}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const heroStyle = {
  padding: "28px",
  border: "1px solid rgba(203, 213, 225, 0.72)",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #ffffff 0%, #f3fbf5 58%, #e9f7ec 100%)",
  boxShadow: "0 18px 42px rgba(148, 163, 184, 0.14)"
};

const eyebrowStyle = {
  color: "#4a9d54",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase"
};

const titleStyle = {
  margin: "10px 0 10px",
  color: "#0f172a",
  fontSize: "42px",
  lineHeight: 1.05
};

const copyStyle = {
  margin: 0,
  maxWidth: "760px",
  color: "#526377",
  lineHeight: 1.65
};

const panelStyle = {
  display: "grid",
  gap: "18px",
  marginTop: "22px",
  padding: "24px",
  border: "1px solid rgba(203, 213, 225, 0.72)",
  borderRadius: "20px",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)"
};

const panelTitleStyle = {
  margin: "8px 0 8px",
  color: "#0f172a",
  fontSize: "24px"
};

const panelCopyStyle = {
  margin: 0,
  color: "#526377",
  lineHeight: 1.6
};

const placeholderGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px"
};

const placeholderCardStyle = {
  display: "grid",
  gap: "8px",
  padding: "16px",
  border: "1px solid rgba(203, 213, 225, 0.72)",
  borderRadius: "16px",
  background: "#f8fafc",
  color: "#526377"
};

const backButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  minHeight: "38px",
  padding: "0 14px",
  borderRadius: "10px",
  background: "#0f172a",
  color: "#ffffff",
  fontWeight: 800,
  textDecoration: "none"
};

const actionBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "16px",
  flexWrap: "wrap"
};

const actionGroupStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "10px",
  flexWrap: "wrap"
};

const summaryPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "36px",
  padding: "0 12px",
  borderRadius: "999px",
  background: "#f8fafc",
  border: "1px solid #e5edf5",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800
};

const secondaryButtonStyle = {
  minHeight: "40px",
  padding: "0 14px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer"
};

const saveButtonStyle = {
  ...secondaryButtonStyle,
  borderColor: "rgba(15, 23, 42, 0.1)",
  background: "#16a34a",
  color: "#ffffff"
};

const dangerButtonStyle = {
  ...secondaryButtonStyle,
  color: "#b91c1c",
  borderColor: "#fecaca",
  background: "#fff7f7"
};

const feedbackStyle = {
  borderRadius: "14px",
  padding: "13px 15px",
  border: "1px solid transparent",
  fontWeight: 700
};

const feedbackSuccessStyle = {
  background: "#f0fdf4",
  color: "#166534",
  borderColor: "#bbf7d0"
};

const feedbackWarningStyle = {
  background: "#fff7ed",
  color: "#c2410c",
  borderColor: "#fdba74"
};

const bannerListStyle = {
  display: "grid",
  gap: "18px"
};

const globalCtaPanelStyle = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe6ef",
  background: "#f8fafc",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden"
};

const mediaTypePanelStyle = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  minHeight: "230px",
  borderRadius: "14px",
  border: "1px solid #e5edf5",
  background: "#ffffff",
  alignContent: "start",
  minWidth: 0,
  boxSizing: "border-box"
};

const editorSectionStyle = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  minHeight: "230px",
  borderRadius: "14px",
  border: "1px solid #e5edf5",
  background: "#ffffff",
  alignContent: "start",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden"
};

const editorSectionTitleStyle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "14px",
  lineHeight: 1.2
};

const wideFieldStyle = {
  gridColumn: "1 / -1"
};

const editorSectionsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  alignItems: "stretch",
  minWidth: 0
};

const compactSectionGridStyle = {
  display: "grid",
  gap: "10px",
  minWidth: 0
};

const pairedFieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  minWidth: 0
};

const halfFieldStyle = {
  gridColumn: "span 6"
};

const thirdFieldStyle = {
  gridColumn: "span 4"
};

const quarterFieldStyle = {
  gridColumn: "span 3"
};

const twoThirdFieldStyle = {
  gridColumn: "span 8"
};

const bannerCardStyle = {
  display: "grid",
  gap: "0",
  padding: "0",
  border: "1px solid rgba(203, 213, 225, 0.82)",
  borderRadius: "18px",
  background: "#ffffff",
  overflow: "hidden"
};

const bannerPreviewButtonStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "170px minmax(0, 1fr)",
  gap: "16px",
  alignItems: "center",
  padding: "14px 16px",
  border: 0,
  background: "#fbfdfc",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer"
};

const bannerPreviewThumbStyle = {
  width: "100%",
  aspectRatio: "16 / 9",
  objectFit: "cover",
  borderRadius: "12px",
  background: "#e2e8f0",
  border: "1px solid #e5edf5"
};

const bannerPreviewContentStyle = {
  display: "grid",
  gap: "5px",
  minWidth: 0
};

const bannerPreviewTitleStyle = {
  color: "#0f172a",
  fontSize: "20px",
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const bannerMetaStyle = {
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700
};

const heroReviewStyle = {
  display: "grid",
  gridTemplateColumns: "190px minmax(0, 1fr)",
  gap: "12px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  border: "1px solid #e5edf5",
  background: "#ffffff",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden"
};

const heroReviewMediaStyle = {
  display: "grid",
  placeItems: "center",
  width: "100%",
  aspectRatio: "16 / 9",
  borderRadius: "12px",
  overflow: "hidden",
  background: "#e2e8f0",
  border: "1px solid #dbe6ef"
};

const heroReviewMediaElementStyle = {
  width: "100%",
  height: "100%",
  display: "block",
  objectFit: "cover"
};

const heroReviewCopyStyle = {
  display: "grid",
  gap: "6px",
  color: "#475569",
  minWidth: 0
};

const bannerEditorStyle = {
  display: "grid",
  gap: "10px",
  padding: "12px",
  borderTop: "1px solid #e5edf5",
  background: "#f8fafc",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden"
};

const bannerCardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap"
};

const bannerTitleStyle = {
  margin: "6px 0 0",
  color: "#0f172a",
  fontSize: "20px"
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px"
};

const heroFormGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: "10px",
  rowGap: "10px",
  alignItems: "start",
  minWidth: 0
};

const uploadGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "10px",
  minWidth: 0
};

const uploadDropzoneStyle = {
  position: "relative",
  display: "grid",
  gridTemplateColumns: "110px minmax(0, 1fr)",
  gridTemplateRows: "auto auto auto",
  columnGap: "12px",
  rowGap: "4px",
  alignItems: "center",
  minHeight: "78px",
  padding: "10px",
  border: "1px dashed #9bc9a3",
  borderRadius: "12px",
  background: "#ffffff",
  cursor: "pointer",
  minWidth: 0,
  boxSizing: "border-box"
};

const fileInputStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  opacity: 0,
  pointerEvents: "none"
};

const uploadPreviewShellStyle = {
  display: "grid",
  placeItems: "center",
  width: "100%",
  height: "58px",
  gridRow: "1 / 4",
  borderRadius: "10px",
  background: "#eef4f1",
  overflow: "hidden",
  border: "1px solid #dbe6ef"
};

const uploadPreviewImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block"
};

const uploadPlaceholderStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  background: "linear-gradient(135deg, #eef4f1 0%, #f8fafc 100%)"
};

const uploadTitleStyle = {
  color: "#0f172a",
  fontSize: "13px",
  lineHeight: 1.25
};

const uploadHelpStyle = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 700
};

const linkPickerShellStyle = {
  position: "relative"
};

const linkPickerButtonStyle = {
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  display: "grid",
  gap: "2px",
  padding: "7px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer"
};

const linkPickerMenuStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 20,
  boxSizing: "border-box",
  display: "grid",
  gap: "8px",
  padding: "10px",
  borderRadius: "14px",
  border: "1px solid #dbe6ef",
  background: "#ffffff",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)"
};

const linkPickerSearchStyle = {
  width: "100%",
  minHeight: "38px",
  boxSizing: "border-box",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 12px",
  fontSize: "14px"
};

const linkPickerOptionsStyle = {
  display: "grid",
  gap: "6px",
  maxHeight: "220px",
  overflowY: "auto"
};

const linkPickerOptionStyle = {
  display: "grid",
  gap: "2px",
  width: "100%",
  padding: "9px 10px",
  borderRadius: "10px",
  border: "1px solid transparent",
  background: "#ffffff",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer"
};

const linkPickerOptionActiveStyle = {
  borderColor: "#bbf7d0",
  background: "#f0fdf4"
};

const categoryManageListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "16px"
};

const homepageCategorySelectorStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 0.65fr)",
  gap: "16px",
  alignItems: "end",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe6ef",
  background: "#f8fafc"
};

const selectorTitleStyle = {
  margin: "6px 0 6px",
  color: "#0f172a",
  fontSize: "18px"
};

const selectorControlsStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: "10px",
  alignItems: "end",
  minWidth: 0
};

const productSelectorControlsStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(180px, 0.75fr) minmax(220px, 1fr) auto",
  gap: "10px",
  alignItems: "end",
  minWidth: 0
};

const categoryFilterPanelStyle = {
  display: "grid",
  gap: "14px",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #dbe6ef",
  background: "#f8fafc"
};

const categoryFilterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "10px"
};

const categoryManageCardStyle = {
  display: "grid",
  gap: "0",
  padding: "0",
  border: "1px solid rgba(203, 213, 225, 0.82)",
  borderRadius: "16px",
  background: "#ffffff",
  overflow: "hidden"
};

const homepageArrangementBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  flexWrap: "wrap"
};

const emptyHomepageCategoryStyle = {
  gridColumn: "1 / -1",
  padding: "22px",
  borderRadius: "16px",
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 700,
  textAlign: "center"
};

const segmentedControlStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "8px"
};

const segmentedButtonStyle = {
  minHeight: "42px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#475569",
  fontWeight: 800,
  cursor: "pointer"
};

const segmentedButtonActiveStyle = {
  borderColor: "#86efac",
  background: "#dcfce7",
  color: "#166534"
};

const segmentedButtonInactiveStyle = {
  borderColor: "#fecaca",
  background: "#fff1f2",
  color: "#b91c1c"
};

const productArrangementListStyle = {
  display: "grid",
  gap: "12px"
};

const productArrangementCardStyle = {
  display: "grid",
  gridTemplateColumns: "72px 92px minmax(0, 1fr) minmax(360px, 0.9fr)",
  gap: "14px",
  alignItems: "center",
  padding: "14px",
  borderRadius: "16px",
  border: "1px solid #dbe6ef",
  background: "#ffffff",
  boxSizing: "border-box"
};

const productArrangementCardDraggingStyle = {
  opacity: 0.58,
  borderColor: "#86efac",
  background: "#f0fdf4"
};

const dragHandleStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  borderRadius: "10px",
  border: "1px dashed #94a3b8",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900,
  cursor: "grab"
};

const productArrangementImageStyle = {
  width: "92px",
  height: "72px",
  objectFit: "cover",
  borderRadius: "12px",
  border: "1px solid #e5edf5",
  background: "#eef4f1"
};

const productArrangementContentStyle = {
  display: "grid",
  gap: "5px",
  minWidth: 0
};

const productArrangementTitleStyle = {
  color: "#0f172a",
  fontSize: "17px",
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const productArrangementControlsStyle = {
  display: "grid",
  gridTemplateColumns: "110px 220px minmax(0, 1fr)",
  gap: "10px",
  alignItems: "end",
  minWidth: 0
};

const productArrangementActionStyle = {
  display: "flex",
  gap: "8px",
  justifyContent: "flex-end",
  flexWrap: "wrap"
};

const brandListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px"
};

const brandCardStyle = {
  display: "grid",
  borderRadius: "16px",
  border: "1px solid #dbe6ef",
  background: "#ffffff",
  overflow: "hidden"
};

const brandPreviewButtonStyle = {
  display: "grid",
  gridTemplateColumns: "96px minmax(0, 1fr)",
  gap: "12px",
  alignItems: "center",
  width: "100%",
  padding: "14px",
  border: 0,
  background: "#fbfdfc",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer"
};

const brandLogoPreviewStyle = {
  display: "grid",
  placeItems: "center",
  width: "96px",
  height: "72px",
  borderRadius: "12px",
  border: "1px solid #e5edf5",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 900,
  overflow: "hidden"
};

const brandLogoImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  display: "block",
  padding: "8px",
  boxSizing: "border-box"
};

const brandPreviewCopyStyle = {
  display: "grid",
  gap: "5px",
  minWidth: 0
};

const brandPreviewTitleStyle = {
  color: "#0f172a",
  fontSize: "18px",
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const brandEditorStyle = {
  display: "grid",
  gap: "12px",
  padding: "14px",
  borderTop: "1px solid #e5edf5",
  background: "#ffffff"
};

const brandEditorGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px"
};

const categoryPreviewButtonStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "86px minmax(0, 1fr)",
  gap: "12px",
  alignItems: "center",
  padding: "14px",
  border: 0,
  background: "#fbfdfc",
  color: "#0f172a",
  textAlign: "left",
  cursor: "pointer"
};

const categoryPreviewImageStyle = {
  width: "86px",
  height: "70px",
  objectFit: "cover",
  borderRadius: "12px",
  border: "1px solid #e5edf5",
  background: "#eef4f1"
};

const categoryPreviewCopyStyle = {
  display: "grid",
  gap: "4px",
  color: "#64748b",
  minWidth: 0
};

const categoryPreviewCopyStyleStrong = {
  color: "#0f172a",
  fontSize: "17px",
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const compactToggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "42px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  minWidth: 0,
  boxSizing: "border-box"
};

const categorySmallGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px"
};

const fieldStyle = {
  display: "grid",
  gap: "5px",
  alignContent: "end",
  minWidth: 0
};

const labelStyle = {
  color: "#475569",
  fontSize: "13px",
  fontWeight: 800
};

const inputStyle = {
  width: "100%",
  minHeight: "42px",
  boxSizing: "border-box",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  padding: "0 12px",
  fontSize: "14px"
};

const disabledControlStyle = {
  opacity: 0.58,
  cursor: "not-allowed",
  background: "#f8fafc"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "82px",
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  resize: "vertical"
};

const previewStyle = {
  display: "grid",
  gridTemplateColumns: "180px minmax(0, 1fr)",
  gap: "14px",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #e5edf5"
};

const previewImageStyle = {
  width: "100%",
  aspectRatio: "16 / 9",
  objectFit: "cover",
  borderRadius: "12px",
  background: "#e2e8f0"
};

const previewCopyStyle = {
  display: "grid",
  gap: "4px",
  color: "#475569"
};
