import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { flattenCategoryTree, fallbackCategoryTree } from "../data/category-data";
import {
  arrivalProducts,
  blogEntries,
  featuredBrands,
  featuredProducts,
  frameProducts,
  homeBanners,
  offerConfigs
} from "../data/storefront-content";
import { copyText } from "../utils/storefront";

function getCategoryHomepageRule(category) {
  const value = category.dynamicRuleJson;
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

export default function Home({ context }) {
  const productCatalog = Array.isArray(context.allProducts) && context.allProducts.length ? context.allProducts : [];
  const siteCategories = context.siteCategories && context.siteCategories.length ? context.siteCategories : fallbackCategoryTree;
  const mainCategories = flattenCategoryTree(siteCategories)
    .filter((category) => !category.parentId && category.status === "active" && Boolean(category.featuredCategory))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  const [activeCategory, setActiveCategory] = useState("all");
  const [bannerIndex, setBannerIndex] = useState(0);
  const homepageSettings = context.siteSettings?.homepage || {};
  const globalHeroCta = homepageSettings.globalHeroCta || {};
  const heroBanners = (homepageSettings.heroBanners || [])
    .filter((banner) => banner.status === "active" && (banner.desktopImage || banner.mobileImage || banner.desktopVideo || banner.mobileVideo))
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  const activeHeroBanners = heroBanners.length
    ? heroBanners
    : homeBanners.map((image, index) => ({
        id: `fallback-${index}`,
        desktopImage: image,
        mobileImage: image,
        title: "",
        subtitle: "",
        altText: "Avyona featured banner",
        textEnabled: true,
        ctaEnabled: true,
        buttonText: "View All Collections",
        buttonLink: "/collections",
        sortOrder: index + 1
      }));
  const currentBanner = activeHeroBanners[bannerIndex] || activeHeroBanners[0];
  const currentIsVideo = currentBanner?.mediaType === "video" && (currentBanner.desktopVideo || currentBanner.mobileVideo);
  const currentButtonText = globalHeroCta.enabled
    ? globalHeroCta.buttonText
    : currentBanner?.ctaEnabled === false
      ? ""
      : currentBanner?.buttonText;
  const currentButtonLink = globalHeroCta.enabled ? globalHeroCta.buttonLink : currentBanner?.buttonLink;
  const titleStyle = {
    fontSize: currentBanner?.titleFontSize ? `clamp(28px, 5vw, ${Number(currentBanner.titleFontSize)}px)` : undefined,
    fontFamily: currentBanner?.fontFamily || undefined,
    fontStyle: currentBanner?.fontStyle || undefined,
    fontWeight: currentBanner?.fontWeight || undefined
  };
  const subtitleStyle = {
    fontSize: currentBanner?.subtitleFontSize ? `${Number(currentBanner.subtitleFontSize)}px` : undefined,
    fontFamily: currentBanner?.fontFamily || undefined,
    fontStyle: currentBanner?.fontStyle || undefined,
    fontWeight: currentBanner?.fontWeight === "800" ? "700" : currentBanner?.fontWeight || undefined
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % activeHeroBanners.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [activeHeroBanners.length]);

  useEffect(() => {
    setBannerIndex(0);
  }, [activeHeroBanners.length]);

  const findProductByIdentifier = (identifier) => {
    const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
    if (!normalizedIdentifier) return null;

    return productCatalog.find((product) =>
      [product.asin, product.sku, product.slug]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === normalizedIdentifier)
    ) || null;
  };
  const getConfiguredHomepageProducts = (key) => Array.isArray(homepageSettings[key])
    ? homepageSettings[key]
        .filter((entry) => entry.status !== "inactive")
        .sort((left, right) => Number(left.slotNumber || left.sortOrder || 0) - Number(right.slotNumber || right.sortOrder || 0))
        .map((entry) => findProductByIdentifier(entry.productAsin || entry.productSlug))
        .filter(Boolean)
    : [];
  const selectedBestSellerCategories = Array.isArray(homepageSettings.bestSellerCategories)
    ? homepageSettings.bestSellerCategories
    : [];
  const configuredOurProducts = Array.isArray(homepageSettings.ourProducts)
    ? getConfiguredHomepageProducts("ourProducts")
    : [];
  const homepageOurProducts = configuredOurProducts.length ? configuredOurProducts : frameProducts;
  const configuredBestSellerProducts = getConfiguredHomepageProducts("bestSellerProducts");
  const allowBestSellerCategory = (product) =>
    !selectedBestSellerCategories.length || selectedBestSellerCategories.includes(product.collectionSlug);
  const bestSellerSourceProducts = (configuredBestSellerProducts.length ? configuredBestSellerProducts : featuredProducts).filter(allowBestSellerCategory);
  const homepageBestSellerProducts = activeCategory === "all"
    ? bestSellerSourceProducts
    : bestSellerSourceProducts.filter((product) => product.collectionSlug === activeCategory);
  const configuredNewArrivalProducts = getConfiguredHomepageProducts("newArrivalProducts");
  const homepageNewArrivalProducts = configuredNewArrivalProducts.length ? configuredNewArrivalProducts : arrivalProducts;
  const configuredFeaturedBrands = Array.isArray(homepageSettings.featuredBrands)
    ? homepageSettings.featuredBrands
        .filter((brand) => brand.status !== "inactive" && (brand.logoUrl || brand.name))
        .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    : [];
  const homepageFeaturedBrands = configuredFeaturedBrands.length
    ? configuredFeaturedBrands
    : featuredBrands.map((brand, index) => ({
        id: `fallback-brand-${brand}`,
        name: brand,
        logoUrl: `/images/${brand}.png`,
        sortOrder: index + 1
      }));

  return (
    <main className="container">
      <section className="hero-banner" aria-label="Featured highlights">
        <div className="hero-slider">
          <article className="hero-slide">
            {currentIsVideo ? (
              <video
                className="hero-banner-image"
                poster={currentBanner.desktopImage || currentBanner.mobileImage}
                autoPlay
                muted
                loop
                playsInline
                aria-label={currentBanner.altText || currentBanner.title || "Avyona featured banner"}
              >
                {currentBanner.mobileVideo ? <source media="(max-width: 767px)" src={currentBanner.mobileVideo} /> : null}
                <source src={currentBanner.desktopVideo || currentBanner.mobileVideo} />
              </video>
            ) : (
              <picture>
                <source media="(max-width: 767px)" srcSet={currentBanner.mobileImage || currentBanner.desktopImage} />
                <img className="hero-banner-image" src={currentBanner.desktopImage || currentBanner.mobileImage} alt={currentBanner.altText || currentBanner.title || "Avyona featured banner"} fetchPriority="high" />
              </picture>
            )}
            {currentBanner.textEnabled !== false && (currentBanner.title || currentBanner.subtitle) ? (
              <div className="hero-banner-copy">
                {currentBanner.title ? <h1 style={titleStyle}>{currentBanner.title}</h1> : null}
                {currentBanner.subtitle ? <p style={subtitleStyle}>{currentBanner.subtitle}</p> : null}
              </div>
            ) : null}
          </article>
        </div>
        {activeHeroBanners.length > 1 ? (
          <>
            <button className="hero-arrow hero-arrow-prev" type="button" onClick={() => setBannerIndex((bannerIndex - 1 + activeHeroBanners.length) % activeHeroBanners.length)}><span aria-hidden="true">&#8249;</span></button>
            <button className="hero-arrow hero-arrow-next" type="button" onClick={() => setBannerIndex((bannerIndex + 1) % activeHeroBanners.length)}><span aria-hidden="true">&#8250;</span></button>
          </>
        ) : null}
        {currentButtonText ? (
          <Link className="hero-banner-cta" to={currentButtonLink || "/collections"}>{currentButtonText}</Link>
        ) : null}
      </section>

      <section className="section-block">
        <div className="section-heading section-heading-centered"><div><p className="eyebrow category-heading-tag">Browse</p><h2>Shop by Category</h2></div></div>
        <div className="category-grid">
          {mainCategories.map((category) => {
            const homepageRule = getCategoryHomepageRule(category);
            const buttonText = homepageRule.homepageButtonText || "Explore Now";
            const buttonLink = homepageRule.homepageButtonLink || `/category/${category.slug}`;

            return (
              <Link key={category.slug} className="category-card category-card-link" to={buttonLink}>
                <div className="category-art"><img src={category.imageUrl || category.bannerImageUrl} alt={category.name} loading="lazy" decoding="async" /></div>
                <div className="category-copy">
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
                <div className="category-meta">
                  <span className="category-meta-label">{`${Number(category.productCount ?? category.productSlugs?.length ?? 0)} Products`}</span>
                  <span className="category-action-chip">{buttonText}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section-block spotlight-block">
        <div className="section-heading section-heading-centered"><div><h3 className="section-title-large section-title-accent">Our Products</h3></div></div>
        <div className="product-grid">{homepageOurProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
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
          {["all", ...mainCategories.map((category) => category.slug)].map((categorySlug) => (
            <button key={categorySlug} className={`catalog-tab ${activeCategory === categorySlug ? "active" : ""}`} type="button" onClick={() => setActiveCategory(categorySlug)}>
              {categorySlug === "all" ? "All" : (mainCategories.find((category) => category.slug === categorySlug)?.name || categorySlug)}
            </button>
          ))}
        </div>
        <div className="product-grid">{homepageBestSellerProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
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
        <div className="mini-grid">{homepageNewArrivalProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}</div>
      </section>

      <section className="section-block blog-section">
        <div className="section-heading"><div><p className="eyebrow">Latest from Avyona Blog</p><h2>Buying guides and electronics insights that support discovery</h2></div></div>
        <div className="blog-grid">
          {blogEntries.map((entry) => (
            <article key={entry.title} className="blog-card">
              <Link className="blog-card-link" to={`/blog/${entry.slug}`}>
                <div className="blog-art"><img src={entry.image} alt={entry.title} loading="lazy" decoding="async" /></div>
                <h3>{entry.title}</h3>
                <p>{entry.body}</p>
                <span className="blog-read-link">Read More</span>
              </Link>
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
            {[...homepageFeaturedBrands, ...homepageFeaturedBrands].map((brand, index) => (
              <div key={`${brand.id || brand.name}-${index}`} className="brand-logo-card" aria-hidden={index >= homepageFeaturedBrands.length}>
                <img src={brand.logoUrl || `/images/${brand.name}.png`} alt={index >= homepageFeaturedBrands.length ? "" : brand.name} loading="lazy" decoding="async" />
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
