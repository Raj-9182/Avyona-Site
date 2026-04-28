import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { allProducts } from "../data/storefront-content";
import { formatCurrency, getSearchResults } from "../utils/storefront";

export default function SearchPage({ context }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const productCatalog = context.allProducts && context.allProducts.length ? context.allProducts : allProducts;
  const rawResults = useMemo(() => getSearchResults(productCatalog, query), [productCatalog, query]);
  const products = rawResults.map((entry) => entry.product);
  const [brandFilter, setBrandFilter] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [rating, setRating] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const prices = products.map((product) => product.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice, query]);

  const brands = [...new Set(products.map((product) => product.brand))];

  useEffect(() => {
    document.body.classList.toggle("search-filters-open", filterOpen);
    return () => document.body.classList.remove("search-filters-open");
  }, [filterOpen]);

  const filtered = products.filter((product) => {
    const brandPass = !brandFilter.length || brandFilter.includes(product.brand);
    const availabilityPass = !availability.length || availability.includes(product.stockTone);
    const ratingPass = Number(product.rating || 0) >= rating;
    const pricePass = Number(product.price || 0) >= priceRange[0] && Number(product.price || 0) <= priceRange[1];
    return brandPass && availabilityPass && ratingPass && pricePass;
  });

  return (
    <main className="container search-page">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Search</span></div>
      <section className="search-hero">
        <div className="search-hero-copy">
          <h1>{query ? `Results for "${query}"` : "Search Products"}</h1>
          <p className="search-summary">{filtered.length} products matched your search.</p>
          <p className="search-helper-note">You can search by product name, brand, category, SKU, or ASIN.</p>
        </div>
      </section>
      <section className="section-block search-panel">
        <div className="search-results-layout">
          <button className="search-mobile-filter-toggle" type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen(true)}>Filter</button>
          {filterOpen ? <div className="search-filter-backdrop" onClick={() => setFilterOpen(false)} /> : null}
          <aside className={`filter-panel ${filterOpen ? "is-open" : ""}`}>
            <div className="filter-panel-head">
              <h2>Filters</h2>
              <button className="search-filter-close" type="button" onClick={() => setFilterOpen(false)}>Close</button>
            </div>
            <div className="filter-group">
              <h3>Brands</h3>
              <div className="filter-options">
                {brands.map((brand) => (
                  <label key={brand} className="filter-option">
                    <input type="checkbox" checked={brandFilter.includes(brand)} onChange={() => setBrandFilter((current) => current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand])} />
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
                    <input type="checkbox" checked={availability.includes(value)} onChange={() => setAvailability((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    <span>{value === "in-stock" ? "In Stock" : "Out of Stock"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-group-head">
                <h3>Price</h3>
                <span>{products.length ? `${formatCurrency(priceRange[0])} - ${formatCurrency(priceRange[1])}` : "No products"}</span>
              </div>
              <div className="range-slider-group">
                <div className="range-track"></div>
                <input type="range" min={minPrice} max={maxPrice} value={priceRange[0]} onChange={(event) => setPriceRange(([_, currentMax]) => [Math.min(Number(event.target.value), currentMax), currentMax])} disabled={!products.length} />
                <input type="range" min={minPrice} max={maxPrice} value={priceRange[1]} onChange={(event) => setPriceRange(([currentMin]) => [currentMin, Math.max(Number(event.target.value), currentMin)])} disabled={!products.length} />
              </div>
            </div>
            <div className="filter-group">
              <h3>Minimum Rating</h3>
              <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
                <option value="0">All Ratings</option>
                <option value="4.5">4.5 and up</option>
                <option value="4">4.0 and up</option>
                <option value="3.5">3.5 and up</option>
              </select>
            </div>
            <button
              className="text-link filter-reset"
              type="button"
              onClick={() => {
                setBrandFilter([]);
                setAvailability([]);
                setRating(0);
                setPriceRange([minPrice, maxPrice]);
                setFilterOpen(false);
              }}
            >
              Reset
            </button>
          </aside>
          <div className="search-results-content">
            <div className="section-heading"><div><h2>Products</h2></div></div>
            <div className="product-grid">
              {filtered.length ? filtered.map((product) => <ProductCard key={product.slug} product={product} context={context} eyebrow={`${product.brand} | ${product.category}`} actionLabel="Open Product" actionMode="link" />) : <div className="empty-state"><h3>No matching products found</h3><p>Try another keyword.</p></div>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
