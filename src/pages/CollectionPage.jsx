import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { collectionData, productData } from "../data/storefront-content";
import { formatCurrency } from "../utils/storefront";

export default function CollectionPage({ context }) {
  const { slug } = useParams();
  const data = collectionData[slug];
  const pageRef = useRef(null);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [rating, setRating] = useState(0);
  const [sortBy, setSortBy] = useState("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [animationSeed, setAnimationSeed] = useState(0);
  const [priceRange, setPriceRange] = useState(() => {
    const prices = (data?.products || []).map((product) => product.price);
    return prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0];
  });

  if (!data) return <Navigate to="/collections" replace />;

  useEffect(() => {
    document.title = `Avyona | ${data.title}`;
  }, [data.title]);

  useEffect(() => {
    const nextPrices = (data.products || []).map((item) => Number(item.price || 0));
    const nextMinPrice = nextPrices.length ? Math.min(...nextPrices) : 0;
    const nextMaxPrice = nextPrices.length ? Math.max(...nextPrices) : 0;

    setSelectedBrands([]);
    setAvailability([]);
    setRating(0);
    setSortBy("featured");
    setPriceRange([nextMinPrice, nextMaxPrice]);
    setFilterOpen(false);
  }, [slug, data]);

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

  const baseProducts = data.products.map((item) => productData[item.slug]).filter(Boolean);
  const brands = [...new Set(baseProducts.map((product) => product.brand))];
  const prices = baseProducts.map((product) => product.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const filtered = baseProducts
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
    setSelectedBrands([]);
    setAvailability([]);
    setRating(0);
    setSortBy("featured");
    setPriceRange([minPrice, maxPrice]);
    setFilterOpen(false);
  };

  useEffect(() => {
    setAnimationSeed((current) => current + 1);
  }, [slug, selectedBrands, availability, rating, sortBy, priceRange]);

  return (
    <main ref={pageRef} className="container collection-page">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>{data.title}</span></div>
      <section className="page-section">
        <div className="collection-reference-shell collection-shell-glow" data-animate="shell">
          <div className="collection-reference-head">
            <div className="collection-summary" data-animate="intro">
              <h1>All Products</h1>
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

          <div className="collection-results-layout">
          {filterOpen ? <div className="collection-filter-backdrop" onClick={() => setFilterOpen(false)} /> : null}
          <aside className={`filter-panel ${filterOpen ? "is-open" : ""}`} data-animate="panel">
            <div className="filter-panel-header">
              <div>
                <h2>Filters</h2>
              </div>
              <button className="collection-filter-close" type="button" onClick={() => setFilterOpen(false)}>Close</button>
            </div>
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
                <span>{`${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}`}</span>
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
          <div className="collection-results-content" data-animate="panel">
            <div className="collection-toolbar collection-filter-toolbar">
              <div className="collection-summary secondary">
                <p className="collection-collection-label">{data.title}</p>
                <p>{data.description}</p>
              </div>
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
          </div>
        </div>
      </section>
    </main>
  );
}
