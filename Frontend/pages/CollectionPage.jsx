import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { flattenCategoryTree, fallbackCategoryTree } from "../data/category-data";
import { allProducts } from "../data/storefront-content";
import { formatCurrency } from "../utils/storefront";

function collectCategoryProducts(category, categoryLookup) {
  const directSlugs = new Set(category.productSlugs || []);
  const childCategories = [...(category.children || [])];

  childCategories.forEach((child) => {
    (child.productSlugs || []).forEach((slug) => directSlugs.add(slug));
  });

  const matched = allProducts.filter((product) => directSlugs.has(product.slug));

  if (matched.length) {
    return matched;
  }

  if (!category.parentId) {
    return allProducts.filter((product) => product.collectionSlug === category.slug);
  }

  const parent = categoryLookup.get(category.parentId);
  return parent ? allProducts.filter((product) => (category.productSlugs || []).includes(product.slug)) : [];
}

function getCategoryTreeFromContext(context) {
  return context.siteCategories && context.siteCategories.length ? context.siteCategories : fallbackCategoryTree;
}

export default function CollectionPage({ context }) {
  const { slug } = useParams();
  const pageRef = useRef(null);
  const categoryTree = getCategoryTreeFromContext(context);
  const flatCategories = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryLookup = useMemo(() => new Map(flatCategories.map((category) => [category.id, category])), [flatCategories]);
  const currentCategory = flatCategories.find((category) => category.slug === slug);
  const childCategories = currentCategory?.children || [];
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [rating, setRating] = useState(0);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [animationSeed, setAnimationSeed] = useState(0);

  const baseProducts = useMemo(() => {
    if (!currentCategory) return [];
    return collectCategoryProducts(currentCategory, categoryLookup);
  }, [currentCategory, categoryLookup]);

  const productsWithSubcategory = useMemo(() => {
    if (!currentCategory) return [];

    const subcategoryBySlug = new Map();
    childCategories.forEach((child) => {
      (child.productSlugs || []).forEach((productSlug) => {
        subcategoryBySlug.set(productSlug, child.slug);
      });
    });

    return baseProducts.map((product) => ({
      ...product,
      subcategorySlug: subcategoryBySlug.get(product.slug) || ""
    }));
  }, [baseProducts, childCategories, currentCategory]);

  const prices = productsWithSubcategory.map((product) => product.price);
  const [priceRange, setPriceRange] = useState(() => {
    const min = prices.length ? Math.min(...prices) : 0;
    const max = prices.length ? Math.max(...prices) : 0;
    return [min, max];
  });

  if (!currentCategory) {
    return <Navigate to="/collections" replace />;
  }

  const brands = [...new Set(productsWithSubcategory.map((product) => product.brand))];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const totalProductCount = baseProducts.length;

  const filtered = productsWithSubcategory
    .filter((product) => !selectedSubcategories.length || selectedSubcategories.includes(product.subcategorySlug))
    .filter((product) => !selectedBrands.length || selectedBrands.includes(product.brand))
    .filter((product) => !availability.length || availability.includes(product.stockTone))
    .filter((product) => Number(product.rating || 0) >= rating)
    .filter((product) => Number(product.price || 0) >= priceRange[0] && Number(product.price || 0) <= priceRange[1])
    .sort((left, right) => {
      if (sortBy === "price-low-high") return left.price - right.price;
      if (sortBy === "price-high-low") return right.price - left.price;
      if (sortBy === "rating-high-low") return Number(right.rating || 0) - Number(left.rating || 0);
      return 0;
    });

  const resetFilters = () => {
    setSelectedSubcategories([]);
    setSelectedBrands([]);
    setAvailability([]);
    setRating(0);
    setSortBy("featured");
    setPriceRange([minPrice, maxPrice]);
    setFilterOpen(false);
  };

  useEffect(() => {
    setSelectedSubcategories([]);
    setSelectedBrands([]);
    setAvailability([]);
    setRating(0);
    setSortBy("featured");
    setPriceRange([minPrice, maxPrice]);
    setFilterOpen(false);
  }, [slug, minPrice, maxPrice]);

  useEffect(() => {
    document.body.classList.add("collection-page");
    document.body.classList.toggle("collection-filters-open", filterOpen);
    return () => {
      document.body.classList.remove("collection-page");
      document.body.classList.remove("collection-filters-open");
    };
  }, [filterOpen]);

  useEffect(() => {
    if (!pageRef.current || typeof window === "undefined" || !("IntersectionObserver" in window)) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
    );

    const animatedItems = pageRef.current.querySelectorAll("[data-animate]");
    animatedItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [slug]);

  useEffect(() => {
    setAnimationSeed((current) => current + 1);
  }, [slug, selectedSubcategories, selectedBrands, availability, rating, sortBy, priceRange]);

  return (
    <main ref={pageRef} className="container collection-page">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{currentCategory.name}</span></div>
      <section className="page-section">
        <div className="collection-reference-layout">
          <section className="collection-reference-shell collection-shell-glow" data-animate="shell">
            {currentCategory.bannerImageUrl ? (
              <div className="collection-hero-media" style={bannerShellStyle} data-animate="intro">
                <img src={currentCategory.bannerImageUrl} alt={currentCategory.name} style={bannerImageStyle} />
              </div>
            ) : null}

            <div className="collection-summary collection-hero-copy" data-animate="intro">
              <p className="collection-product-count">{`${totalProductCount} PRODUCTS`}</p>
              <h1>{currentCategory.name}</h1>
              <p>{currentCategory.description || "Browse products inside this category."}</p>
            </div>
          </section>

          <section className="collection-products-shell" data-animate="panel">
            <div className="collection-reference-head">
              <div className="collection-summary secondary">
                <h2>All Products</h2>
                <p>Browse the complete featured selection from this collection.</p>
              </div>
              <div className="collection-toolbar-actions" data-animate="intro">
                <button
                  className="collection-mobile-filter-toggle"
                  type="button"
                  aria-expanded={filterOpen}
                  onClick={() => setFilterOpen(true)}
                >
                  Filters
                </button>
                <label className="collection-sort-control">
                  <span className="collection-sort-label">Sort By</span>
                  <select className="collection-sort-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="featured">Featured</option>
                    <option value="price-low-high">Price: Low to High</option>
                    <option value="price-high-low">Price: High to Low</option>
                    <option value="rating-high-low">Top Rated</option>
                  </select>
                </label>
                <button className="collection-reset-button" type="button" onClick={resetFilters}>Reset Filters</button>
              </div>
            </div>

            {filterOpen ? <div className="collection-filter-backdrop" onClick={() => setFilterOpen(false)} /> : null}
            <aside className={`filter-panel ${filterOpen ? "is-open" : ""}`}>
              <div className="filter-panel-header">
                <div><h2>Filters</h2></div>
                <button className="collection-filter-close" type="button" onClick={() => setFilterOpen(false)}>Close</button>
              </div>

              {childCategories.length ? (
                <div className="filter-group">
                  <h3>Subcategories</h3>
                  <div className="filter-options">
                    {childCategories.map((child) => (
                      <label key={child.slug} className="filter-option">
                        <input
                          type="checkbox"
                          checked={selectedSubcategories.includes(child.slug)}
                          onChange={() => setSelectedSubcategories((current) => current.includes(child.slug) ? current.filter((value) => value !== child.slug) : [...current, child.slug])}
                        />
                        <span>{child.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="filter-group">
                <h3>Brands</h3>
                <div className="filter-options">
                  {brands.map((brand) => (
                    <label key={brand} className="filter-option">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => setSelectedBrands((current) => current.includes(brand) ? current.filter((value) => value !== brand) : [...current, brand])}
                      />
                      <span>{brand}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <h3>Availability</h3>
                <div className="filter-options">
                  {["in-stock", "out-of-stock"].map((value) => (
                    <label key={value} className="filter-option">
                      <input
                        type="checkbox"
                        checked={availability.includes(value)}
                        onChange={() => setAvailability((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}
                      />
                      <span>{value === "in-stock" ? "In Stock" : "Out of Stock"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <div className="filter-group-head">
                  <h3>Price</h3>
                  <span>{`${formatCurrency(priceRange[0], context)} - ${formatCurrency(priceRange[1], context)}`}</span>
                </div>
                <div className="range-slider-group">
                  <div className="range-track"></div>
                  <input type="range" min={minPrice} max={maxPrice} value={priceRange[0]} onChange={(event) => setPriceRange(([_, currentMax]) => [Math.min(Number(event.target.value), currentMax), currentMax])} />
                  <input type="range" min={minPrice} max={maxPrice} value={priceRange[1]} onChange={(event) => setPriceRange(([currentMin]) => [currentMin, Math.max(Number(event.target.value), currentMin)])} />
                </div>
              </div>

              <div className="filter-group">
                <h3>Ratings</h3>
                <div className="filter-options rating-options">
                  {[
                    { label: "All Ratings", value: 0 },
                    { label: "4.5 & Up", value: 4.5 },
                    { label: "4.0 & Up", value: 4 },
                    { label: "3.5 & Up", value: 3.5 }
                  ].map((option) => (
                    <label key={option.label} className="filter-option rating-option">
                      <input
                        type="radio"
                        name="collection-rating"
                        checked={rating === option.value}
                        onChange={() => setRating(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="collection-reset-button filter-reset" type="button" onClick={resetFilters}>Reset Filters</button>
            </aside>

            <div className="collection-results-content">
              <div className="collection-toolbar collection-filter-toolbar">
                <div className="collection-results-meta">
                  <span>{filtered.length} matching products</span>
                </div>
              </div>
              <div className="product-grid">
                {filtered.map((product, index) => (
                  <div
                    key={`${product.slug}-${animationSeed}`}
                    className="collection-card-reveal"
                    style={{ "--card-index": index }}
                  >
                    <ProductCard product={product} context={context} />
                  </div>
                ))}
              </div>
              {!filtered.length ? <div className="collection-empty-state">No products match the selected filters.</div> : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

const bannerShellStyle = {
  width: "100%",
  borderRadius: "22px",
  overflow: "hidden",
  border: "1px solid rgba(203, 213, 225, 0.7)",
  boxShadow: "0 14px 34px rgba(174, 203, 190, 0.12)"
};

const bannerImageStyle = {
  width: "100%",
  height: "260px",
  objectFit: "cover",
  display: "block"
};
