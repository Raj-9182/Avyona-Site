import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { flattenCategoryTree } from "../../data/category-data";
import { getSuggestionEntries, getSuggestionScore } from "../../utils/storefront";

export default function SiteHeader({ context, allProducts }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const siteSettings = context.siteSettings || {};
  const general = siteSettings.general || {};
  const shipping = siteSettings.shipping || {};
  const payment = siteSettings.payment || {};
  const tracking = siteSettings.tracking || {};
  const siteCategories = context.siteCategories || [];
  const navigate = useNavigate();
  const location = useLocation();
  const suggestionEntries = useMemo(() => getSuggestionEntries(allProducts), [allProducts]);
  const menuCategories = useMemo(
    () => flattenCategoryTree(siteCategories)
      .filter((category) => category.showInMenu && category.status === "active" && !category.parentId)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)),
    [siteCategories]
  );

  const suggestions = useMemo(() => {
    if (!searchFocused || !query.trim()) return [];
    return suggestionEntries
      .map((entry) => ({ entry, score: getSuggestionScore(query, entry) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
      .slice(0, 6);
  }, [query, searchFocused, suggestionEntries]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === "/search") {
      setQuery(params.get("q") || "");
    } else {
      setQuery("");
    }
    setSearchFocused(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  const submitSearch = (value) => {
    const safeQuery = value.trim();
    setSearchFocused(false);
    navigate(safeQuery ? `/search?q=${encodeURIComponent(safeQuery)}` : "/search");
    setMenuOpen(false);
  };

  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-content">
          <p>{shipping.freeShippingThreshold ? `Free shipping above ${shipping.freeShippingThreshold}` : "Free shipping on selected products"}</p>
          <p>{payment.codEnabled ? "COD available across India" : "Secure prepaid checkout available"}</p>
          <p>{general.brandTagline || "Genuine products from trusted brands"}</p>
          <Link to="/contact">Need help? Talk to our team</Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-top">
          <button className="menu-toggle" type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v2H4zM4 11h16v2H4zM4 15h16v2H4z" /></svg>
          </button>
          <Link className="brand-lockup" to="/" aria-label={`${general.storeName || "Avyona"} home`}>
            <img className="brand-logo" src={general.logoUrl || "/images/optimized/avyona-logo.webp"} alt={`${general.storeName || "Avyona"} logo`} fetchPriority="high" />
          </Link>
          <label className="header-search" aria-label="Search Avyona products">
            <span className="search-icon" aria-hidden="true">&#8981;</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitSearch(query);
                }
              }}
              placeholder="Search products, brands, ASIN, SKU, features"
            />
            {suggestions.length ? (
              <div className="search-suggestion-list">
                {suggestions.map(({ entry }) => (
                  <button key={`${entry.type}:${entry.label}`} className="search-suggestion-item" type="button" onClick={() => submitSearch(entry.label)}>
                    <strong>{entry.label}</strong>
                    <span>{entry.type}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>
          <div className="header-utilities">
            <Link className="icon-link" to={context.authUser ? "/profile" : "/account"} aria-label="Account">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.86 0-7 2.24-7 5v1h14v-1c0-2.76-3.14-5-7-5Z" /></svg>
            </Link>
            <Link className="icon-link" to="/wishlist" aria-label="Wishlist">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.55 10.55 19.2C5.4 14.45 2 11.36 2 7.5A5.5 5.5 0 0 1 7.5 2 6 6 0 0 1 12 4.09 6 6 0 0 1 16.5 2 5.5 5.5 0 0 1 22 7.5c0 3.86-3.4 6.95-8.55 11.7Z" /></svg>
            </Link>
            <button className="cart-button" type="button" data-cart-target="true" onClick={() => context.setIsCartOpen(true)} aria-label="Open cart">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a2 2 0 1 0 2 2 2 2 0 0 0-2-2Zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2ZM7.17 14h9.92a2 2 0 0 0 1.95-1.57L21 6H6.21l-.32-2H2v2h2.19l1.72 8.59A2 2 0 0 0 7.88 16H19v-2H7.88Z" /></svg>
              <span>{context.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</span>
            </button>
          </div>
        </div>
        <div className="container nav-row">
          <nav className={`main-nav ${menuOpen ? "open" : ""}`} aria-label="Primary navigation">
            {menuCategories.map((category) => (
              <NavLink key={category.slug} to={`/category/${category.slug}`} onClick={() => setMenuOpen(false)}>
                {category.name}
              </NavLink>
            ))}
            <NavLink to="/contact" onClick={() => setMenuOpen(false)}>Contact Us</NavLink>
            {tracking.trackingPageEnabled ? (
              <NavLink to="/track-order" onClick={() => setMenuOpen(false)}>Track Your Order</NavLink>
            ) : null}
          </nav>
        </div>
      </header>
    </>
  );
}
