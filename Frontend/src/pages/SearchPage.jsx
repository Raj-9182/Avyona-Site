import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { trackAnalyticsEvent } from "../api/analyticsApi";
import { fetchStorefrontProducts } from "../api/productApi";
import ProductCard from "../components/product/ProductCard";
import { allProducts } from "../data/storefront-content";
import { formatCurrency, getSearchResults } from "../utils/storefront";

function normalizeBackendProduct(product) {
  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || price || 0);
  const stockQuantity = Number(product.stockQuantity || 0);
  const discount = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const collectionSlug = product.categorySlug || String(product.categoryName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const gallery = Array.isArray(product.galleryUrls) && product.galleryUrls.length ? product.galleryUrls.filter(Boolean) : [];
  const primaryImage = gallery[0] || product.imageUrl || "";

  return {
    id: product.id,
    asin: product.asin,
    sku: product.asin || product.sku,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.categoryName || "Products",
    collectionSlug,
    price,
    mrp,
    discount,
    image: primaryImage,
    gallery,
    highlights: [product.shortDescription || "New Avyona product"].filter(Boolean),
    description: product.description ? String(product.description).split(/\n+/).filter(Boolean) : [product.shortDescription || "Product details will be updated soon."],
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
    availableStock: stockQuantity,
    stockTone: stockQuantity > 0 ? "in-stock" : "out-of-stock",
    variants: [],
    specGroups: [],
    reviews: [],
    faqs: []
  };
}

export default function SearchPage({ context }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const productCatalog = context.allProducts && context.allProducts.length ? context.allProducts : allProducts;
  const fallbackResults = useMemo(() => getSearchResults(productCatalog, query), [productCatalog, query]);
  const [serverProducts, setServerProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 });
  const [facets, setFacets] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [brandFilter, setBrandFilter] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [rating, setRating] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const trackedQueryRef = useRef("");
  const trackedFilterRef = useRef("");
  const products = serverUnavailable ? fallbackResults.map((entry) => entry.product) : serverProducts;
  const prices = products.map((product) => product.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);

  useEffect(() => {
    setPriceRange([minPrice, maxPrice]);
  }, [minPrice, maxPrice, query]);

  useEffect(() => {
    setPage(1);
  }, [query, brandFilter, availability, rating]);

  useEffect(() => {
    let isMounted = true;

    async function loadSearchResults() {
      setIsLoading(true);
      try {
        const response = await fetchStorefrontProducts({
          status: "active",
          search: query,
          brand: brandFilter.length === 1 ? brandFilter[0] : "",
          availability: availability.length === 1 ? availability[0] : "",
          minPrice: priceRange[0] || "",
          maxPrice: priceRange[1] || "",
          sort: rating ? "rating-high-low" : "newest",
          page,
          limit: 24
        });
        if (!isMounted) return;
        setServerProducts((Array.isArray(response.data) ? response.data : []).map(normalizeBackendProduct));
        setPagination(response.pagination || { page, limit: 24, total: 0, totalPages: 1 });
        setFacets(response.facets || null);
        setServerUnavailable(false);
        if (query.trim() && trackedQueryRef.current !== query.trim().toLowerCase()) {
          trackedQueryRef.current = query.trim().toLowerCase();
          trackAnalyticsEvent({
            eventType: "search",
            query: query.trim(),
            metadata: {
              resultCount: Number(response.pagination?.total ?? response.count ?? 0)
            }
          });
        }
      } catch {
        if (!isMounted) return;
        setServerUnavailable(true);
        if (query.trim() && trackedQueryRef.current !== query.trim().toLowerCase()) {
          trackedQueryRef.current = query.trim().toLowerCase();
          trackAnalyticsEvent({
            eventType: "search",
            query: query.trim(),
            metadata: {
              resultCount: fallbackResults.length,
              source: "fallback"
            }
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSearchResults();

    return () => {
      isMounted = false;
    };
  }, [availability, brandFilter, page, priceRange, query, rating]);

  const brands = facets?.brands?.length ? facets.brands.map((brand) => brand.value) : [...new Set(products.map((product) => product.brand))];

  const trackSearchResultClick = (product) => {
    if (!query.trim()) return;

    trackAnalyticsEvent({
      eventType: "product_view",
      productId: product.id,
      productAsin: product.asin,
      productSlug: product.slug,
      clickedProductId: product.id,
      clickedProductAsin: product.asin,
      clickedProductSlug: product.slug,
      query: query.trim(),
      resultCount: pagination.total || filtered.length,
      metadata: {
        surface: "search_results",
        productName: product.name,
        resultCount: pagination.total || filtered.length
      }
    });
  };

  useEffect(() => {
    document.body.classList.toggle("search-filters-open", filterOpen);
    return () => document.body.classList.remove("search-filters-open");
  }, [filterOpen]);

  const filtered = (serverUnavailable ? products : products).filter((product) => {
    const brandPass = !brandFilter.length || brandFilter.includes(product.brand);
    const availabilityPass = !availability.length || availability.includes(product.stockTone);
    const ratingPass = Number(product.rating || 0) >= rating;
    const pricePass = Number(product.price || 0) >= priceRange[0] && Number(product.price || 0) <= priceRange[1];
    return brandPass && availabilityPass && ratingPass && pricePass;
  });

  useEffect(() => {
    const hasFilter = brandFilter.length || availability.length || rating || priceRange[0] !== minPrice || priceRange[1] !== maxPrice;
    if (!hasFilter) return;

    const filterKey = JSON.stringify({
      query: query.trim(),
      brandFilter,
      availability,
      rating,
      priceRange
    });
    if (trackedFilterRef.current === filterKey) return;
    trackedFilterRef.current = filterKey;

    trackAnalyticsEvent({
      eventType: "filter_applied",
      query: query.trim(),
      metadata: {
        surface: "search",
        filters: {
          brands: brandFilter,
          availability,
          minPrice: priceRange[0],
          maxPrice: priceRange[1],
          rating
        },
        resultCount: filtered.length
      }
    });
  }, [availability, brandFilter, filtered.length, maxPrice, minPrice, priceRange, query, rating]);

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
            <div className="section-heading"><div><h2>Products</h2>{isLoading ? <p>Loading products...</p> : null}</div></div>
            <div className="product-grid">
              {filtered.length ? filtered.map((product) => <ProductCard key={product.slug} product={product} context={context} eyebrow={`${product.brand} | ${product.category}`} actionLabel="Open Product" actionMode="link" onProductClick={trackSearchResultClick} />) : <div className="empty-state"><h3>No matching products found</h3><p>Try another keyword.</p></div>}
            </div>
            {!serverUnavailable && pagination.totalPages > 1 ? (
              <div className="dashboard-toolbar-actions" style={{ justifyContent: "center", marginTop: "24px" }}>
                <button className="collection-reset-button" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                <span>{`Page ${pagination.page} of ${pagination.totalPages}`}</span>
                <button className="collection-reset-button" type="button" disabled={!pagination.hasNextPage} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
