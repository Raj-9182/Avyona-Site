import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import {
  arrivalProducts,
  blogEntries,
  categoryRouteMap,
  collectionData,
  featuredBrands,
  featuredProducts,
  frameProducts,
  homeBanners,
  offerConfigs
} from "../data/storefront-content";
import { copyText } from "../utils/storefront";

export default function Home({ context }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setBannerIndex((current) => (current + 1) % homeBanners.length), 3500);
    return () => window.clearInterval(id);
  }, []);

  const catalogProducts = activeCategory === "all"
    ? featuredProducts
    : featuredProducts.filter((product) => product.category === activeCategory);

  return (
    <main className="container">
      <section className="hero-banner" aria-label="Featured highlights">
        <div className="hero-slider">
          <article className="hero-slide">
            <img className="hero-banner-image" src={homeBanners[bannerIndex]} alt="Avyona featured banner" fetchPriority="high" />
          </article>
        </div>
        <button className="hero-arrow hero-arrow-prev" type="button" onClick={() => setBannerIndex((bannerIndex - 1 + homeBanners.length) % homeBanners.length)}><span aria-hidden="true">&#8249;</span></button>
        <button className="hero-arrow hero-arrow-next" type="button" onClick={() => setBannerIndex((bannerIndex + 1) % homeBanners.length)}><span aria-hidden="true">&#8250;</span></button>
        <Link className="hero-banner-cta" to="/collections">View All Collections</Link>
      </section>

      <section className="section-block">
        <div className="section-heading section-heading-centered"><div><p className="eyebrow category-heading-tag">Browse</p><h2>Shop by Category</h2></div></div>
        <div className="category-grid">
          {Object.entries(collectionData).map(([slug, collection]) => (
            <Link key={slug} className="category-card category-card-link" to={categoryRouteMap[slug]}>
              <div className="category-art"><img src={collection.bannerImage} alt={collection.title} loading="lazy" decoding="async" /></div>
              <div className="category-copy">
                <h3>{collection.title}</h3>
                <p>{collection.description}</p>
              </div>
              <div className="category-meta">
                <span className="category-meta-label">{collection.eyebrow}</span>
                <span className="category-action-chip">Explore Now</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-block spotlight-block">
        <div className="section-heading section-heading-centered"><div><h3 className="section-title-large section-title-accent">Our Products</h3></div></div>
        <div className="product-grid">{frameProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
      </section>

      <section className="trust-section">
        <div className="section-heading section-heading-centered"><div><h4 className="section-title-medium">Why Shop With Avyona</h4></div></div>
        <div className="trust-grid">
          <article><span className="trust-icon" aria-hidden="true">&#10003;</span><strong>Genuine Products</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#8377;</span><strong>COD Available</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#128274;</span><strong>Secure Payments</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#9889;</span><strong>Fast Shipping</strong></article>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading section-heading-centered catalog-heading"><div><h4 className="section-title-medium">Best Sellers and Trending</h4></div></div>
        <div className="catalog-tabs">
          {["all", "Personal Audio", "Professional Audio", "Digital Camera", "Security Camera", "Avyona Digital Photo Frames", "Reading Light"].map((category) => (
            <button key={category} className={`catalog-tab ${activeCategory === category ? "active" : ""}`} type="button" onClick={() => setActiveCategory(category)}>
              {category === "all" ? "All" : category === "Avyona Digital Photo Frames" ? "Digital Photo Frames" : category}
            </button>
          ))}
        </div>
        <div className="product-grid">{catalogProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
      </section>

      <section className="section-block limited-offers-section">
        <div className="offers-showcase">
          <div className="section-heading section-heading-centered offer-heading"><div><h2 className="section-title-large section-title-accent">Limited Time Offers</h2></div></div>
          <div className="offer-banner-section">
            {Object.entries(offerConfigs).map(([key, offer]) => (
              <article key={key} className={`offer-banner promo-banner offer-banner-${key}`}>
                <div className="offer-banner-media">
                  <img src={offer.image} alt={offer.title} loading="lazy" decoding="async" />
                </div>
                <span className="offer-tag">{offer.title}</span>
                <div className="offer-banner-copy">
                  <p className="eyebrow">{offer.eyebrow}</p>
                  <h3>{offer.description}</h3>
                  <div className="offer-actions">
                    <button className="offer-copy-button" type="button" onClick={() => copyText(offer.coupon, () => context.notify("Coupon copied"))}>{`Copy ${offer.coupon}`}</button>
                    <Link className="primary-button" to={`/offers?offer=${key}`}>Explore</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading section-heading-centered arrival-heading"><div><p className="eyebrow">New Arrivals</p></div></div>
        <div className="mini-grid">{arrivalProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
      </section>

      <section className="section-block blog-section">
        <div className="section-heading"><div><p className="eyebrow">Latest from Avyona Blog</p><h2>Buying guides and electronics insights that support discovery</h2></div></div>
        <div className="blog-grid">
          {blogEntries.map((entry) => (
            <article key={entry.title} className="blog-card">
              <div className="blog-art"><img src={entry.image} alt={entry.title} loading="lazy" decoding="async" /></div>
              <h3>{entry.title}</h3>
              <p>{entry.body}</p>
              <Link to="/collections">Read More</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block brand-section" id="brands">
        <div className="section-heading section-heading-centered brand-heading">
          <div>
            <p className="eyebrow">Featured Brands</p>
          </div>
        </div>
        <div className="brand-grid">
          <div className="brand-track">
            {[...featuredBrands, ...featuredBrands].map((brand, index) => (
              <div key={`${brand}-${index}`} className="brand-logo-card" aria-hidden={index >= featuredBrands.length}>
                <img src={`/images/${brand}.png`} alt={index >= featuredBrands.length ? "" : brand} loading="lazy" decoding="async" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-copy-group">
          <p className="eyebrow">Stay Updated</p>
          <p className="newsletter-copy">Get offers, product launches, and helpful buying guides from Avyona.</p>
        </div>
        <form
          className="newsletter-form"
          onSubmit={(event) => {
            event.preventDefault();
            context.notify("Subscribed successfully");
            event.currentTarget.reset();
          }}
        >
          <input type="email" placeholder="Enter your email address" aria-label="Email address" required />
          <button className="primary-button" type="submit">Subscribe</button>
        </form>
      </section>
    </main>
  );
}
