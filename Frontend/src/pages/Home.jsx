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

const API_MEDIA_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1")
  .replace(/\/api\/v\d+\/?$/i, "")
  .replace(/\/$/, "");

function resolveStorefrontMediaUrl(value, fallback = "/images/optimized/personal-audio-category.webp") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (/^(data|blob):/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/uploads/")) return `${API_MEDIA_ORIGIN}${url}`;
  return url.startsWith("/") ? url : `/${url}`;
}

function handleCategoryImageError(event) {
  const fallback = "/images/optimized/personal-audio-category.webp";
  if (event.currentTarget.src.endsWith(fallback)) return;
  event.currentTarget.src = fallback;
}

function getHomepageBrowseEntryKey(entry) {
  return String(entry.categoryId ?? entry.categorySlug ?? entry.id ?? "");
}

function getCategoryKey(category) {
  return String(category.id ?? category.slug ?? category.name ?? "");
}

function normalizeCardsPerRow(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.min(10, Math.max(1, Math.floor(count))) : 4;
}

function normalizeMobileCardsPerRow(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.min(3, Math.max(1, Math.floor(count))) : 1;
}

function getBrowseCategoriesSettings(homepageSettings = {}) {
  const settings = homepageSettings.browseCategoriesSettings || {};
  return {
    enabled: settings.enabled !== false,
    title: String(settings.title || "Shop by Category").trim(),
    subtitle: String(settings.subtitle || "").trim(),
    cardsPerRow: normalizeCardsPerRow(settings.cardsPerRow),
    mobileCardsPerRow: normalizeMobileCardsPerRow(settings.mobileCardsPerRow)
  };
}

function getHomepageSectionSettings(homepageSettings = {}, key, fallback) {
  const settings = homepageSettings[key] || {};
  return {
    ...fallback,
    ...settings,
    enabled: settings.enabled !== false,
    title: String(settings.title || fallback.title).trim(),
    subtitle: String(settings.subtitle || "").trim(),
    cardsPerRow: normalizeCardsPerRow(settings.cardsPerRow ?? fallback.cardsPerRow),
    mobileCardsPerRow: normalizeMobileCardsPerRow(settings.mobileCardsPerRow ?? fallback.mobileCardsPerRow),
    sortOrder: Number.isFinite(Number(settings.sortOrder)) ? Number(settings.sortOrder) : fallback.sortOrder
  };
}

function isActiveProduct(product) {
  return String(product?.status || "active").toLowerCase() === "active";
}

function getHomepageBrowseCategories(siteCategories, homepageSettings) {
  const flatCategories = flattenCategoryTree(siteCategories).filter((category) => !category.parentId && category.status === "active");
  const configured = Array.isArray(homepageSettings.browseCategories) ? homepageSettings.browseCategories : [];

  if (!configured.length) {
    return flatCategories
      .filter((category) => Boolean(category.featuredCategory))
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  }

  return configured
    .filter((entry) => entry.status !== "inactive" && entry.showOnHomepage !== false)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    .map((entry) => {
      const entryKey = getHomepageBrowseEntryKey(entry);
      const category = flatCategories.find((item) =>
        getCategoryKey(item) === entryKey ||
        String(item.slug || "") === String(entry.categorySlug || "")
      );

      if (!category) return null;

      const currentRule = getCategoryHomepageRule(category);
      return {
        ...category,
        imageUrl: entry.imageUrl || category.imageUrl,
        dynamicRuleJson: {
          ...currentRule,
          homepageButtonText: entry.buttonText || currentRule.homepageButtonText || "Explore Now",
          homepageButtonLink: entry.buttonLink || currentRule.homepageButtonLink || `/category/${category.slug}`
        },
        sortOrder: Number(entry.sortOrder || category.sortOrder || 0)
      };
    })
    .filter(Boolean);
}

function isBannerInDisplayWindow(banner) {
  const now = new Date();
  const startDate = banner.startDate ? new Date(`${String(banner.startDate).slice(0, 10)}T00:00:00`) : null;
  const endDate = banner.endDate ? new Date(`${String(banner.endDate).slice(0, 10)}T23:59:59`) : null;

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  return true;
}

function isExternalLink(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function isSafeHeroLink(value) {
  const link = String(value || "").trim();
  return !link || link.startsWith("/") || isExternalLink(link);
}

function isVideoHeroBanner(banner) {
  const videoUrl = String(banner?.desktopVideo || banner?.mobileVideo || "").trim();
  return banner?.mediaType === "video" || /\.(mp4|webm|mov)(?:\?|#|$)/i.test(videoUrl);
}

function getVideoMimeType(url) {
  const value = String(url || "").toLowerCase();
  if (value.includes(".webm")) return "video/webm";
  if (value.includes(".mov")) return "video/quicktime";
  return "video/mp4";
}

export default function Home({ context }) {
  const productCatalog = Array.isArray(context.allProducts) && context.allProducts.length ? context.allProducts : [];
  const siteCategories = context.siteCategories && context.siteCategories.length ? context.siteCategories : fallbackCategoryTree;
  const [activeCategory, setActiveCategory] = useState("all");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isMobileHeroViewport, setIsMobileHeroViewport] = useState(false);
  const [failedBannerMedia, setFailedBannerMedia] = useState({});
  const homepageSettings = context.siteSettings?.homepage || {};
  const browseCategoriesSettings = getBrowseCategoriesSettings(homepageSettings);
  const ourProductsSettings = getHomepageSectionSettings(homepageSettings, "ourProductsSettings", {
    enabled: true,
    title: "Our Products",
    subtitle: "",
    cardsPerRow: 4,
    mobileCardsPerRow: 2,
    sortOrder: 20
  });
  const bestSellerProductsSettings = getHomepageSectionSettings(homepageSettings, "bestSellerProductsSettings", {
    enabled: true,
    title: "Best Sellers and Trending",
    subtitle: "",
    cardsPerRow: 4,
    mobileCardsPerRow: 2,
    sortOrder: 40
  });
  const newArrivalProductsSettings = getHomepageSectionSettings(homepageSettings, "newArrivalProductsSettings", {
    enabled: true,
    title: "New Arrivals",
    subtitle: "",
    cardsPerRow: 3,
    mobileCardsPerRow: 2,
    sortOrder: 60
  });
  const mainCategories = getHomepageBrowseCategories(siteCategories, homepageSettings);
  const activeTopCategories = flattenCategoryTree(siteCategories)
    .filter((category) => !category.parentId && category.status === "active")
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
  const globalHeroCta = homepageSettings.globalHeroCta || {};
  const heroBanners = (homepageSettings.heroBanners || [])
    .filter((banner) =>
      banner.status === "active" &&
      isBannerInDisplayWindow(banner) &&
      (banner.desktopImage || banner.mobileImage || banner.desktopVideo || banner.mobileVideo)
    )
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
  const currentVideoUrl = currentBanner?.desktopVideo || currentBanner?.mobileVideo || "";
  const currentMobileVideoUrl = currentBanner?.mobileVideo || currentBanner?.desktopVideo || "";
  const currentIsVideo = isVideoHeroBanner(currentBanner) && Boolean(currentVideoUrl || currentMobileVideoUrl);
  const currentVideoSrc = isMobileHeroViewport && currentMobileVideoUrl
    ? currentMobileVideoUrl
    : currentVideoUrl || currentMobileVideoUrl;
  const currentButtonText = globalHeroCta.enabled
    ? globalHeroCta.buttonText
    : currentBanner?.ctaEnabled === false
      ? ""
      : currentBanner?.buttonText;
  const currentButtonLink = globalHeroCta.enabled ? globalHeroCta.buttonLink : currentBanner?.buttonLink;
  const safeButtonLink = isSafeHeroLink(currentButtonLink) ? currentButtonLink : "/collections";
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
    if (isHeroPaused || activeHeroBanners.length < 2) return undefined;

    const id = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % activeHeroBanners.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [activeHeroBanners.length, isHeroPaused]);

  useEffect(() => {
    setBannerIndex(0);
  }, [activeHeroBanners.length]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileHeroViewport(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener?.("change", updateViewport);
    return () => mediaQuery.removeEventListener?.("change", updateViewport);
  }, []);

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
        .map((entry) => {
          const product = findProductByIdentifier(entry.productAsin || entry.productSlug);
          return product ? { ...product, ...entry } : null;
        })
        .filter(Boolean)
    : [];
  const hasBestSellerCategoryConfig = Array.isArray(homepageSettings.bestSellerCategories);
  const selectedBestSellerCategories = hasBestSellerCategoryConfig
    ? homepageSettings.bestSellerCategories
    : [];
  const configuredOurProducts = Array.isArray(homepageSettings.ourProducts)
    ? getConfiguredHomepageProducts("ourProducts")
    : [];
  const homepageOurProducts = (configuredOurProducts.length ? configuredOurProducts : frameProducts)
    .filter((product) => isActiveProduct(product) && product.showInOurProducts !== false);
  const configuredBestSellerProducts = getConfiguredHomepageProducts("bestSellerProducts");
  const allowBestSellerCategory = (product) =>
    !hasBestSellerCategoryConfig || selectedBestSellerCategories.includes(product.collectionSlug);
  const bestSellerCategoryTabs = hasBestSellerCategoryConfig
    ? activeTopCategories.filter((category) => selectedBestSellerCategories.includes(category.slug))
    : activeTopCategories;
  const bestSellerSourceProducts = (configuredBestSellerProducts.length ? configuredBestSellerProducts : featuredProducts)
    .filter(allowBestSellerCategory)
    .filter((product) => isActiveProduct(product) && product.bestSeller !== false && product.trending !== false);
  const homepageBestSellerProducts = activeCategory === "all"
    ? bestSellerSourceProducts
    : bestSellerSourceProducts.filter((product) => product.collectionSlug === activeCategory);
  const configuredNewArrivalProducts = getConfiguredHomepageProducts("newArrivalProducts");
  const homepageNewArrivalProducts = (configuredNewArrivalProducts.length ? configuredNewArrivalProducts : arrivalProducts)
    .filter((product) => isActiveProduct(product) && product.newArrival !== false);
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

  useEffect(() => {
    if (activeCategory === "all") return;
    if (!bestSellerCategoryTabs.some((category) => category.slug === activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, bestSellerCategoryTabs]);

  return (
    <main className="container">
      <section
        className="hero-banner"
        aria-label="Featured highlights"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
      >
        <div className="hero-slider">
          <article className="hero-slide">
            {!currentIsVideo && failedBannerMedia[currentBanner?.id] ? (
              <img className="hero-banner-image" src="/images/optimized/banner-1.webp" alt="Avyona featured banner fallback" fetchPriority="high" />
            ) : currentIsVideo ? (
              <video
                key={`hero-video-${currentBanner.id || currentVideoSrc}`}
                className="hero-banner-image"
                src={currentVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label={currentBanner.altText || currentBanner.title || "Avyona featured banner"}
                onLoadedData={(event) => {
                  event.currentTarget.play?.().catch?.(() => {});
                }}
                onCanPlay={(event) => {
                  event.currentTarget.play?.().catch?.(() => {});
                }}
              />
            ) : (
              <picture>
                <source media="(max-width: 767px)" srcSet={currentBanner.mobileImage || currentBanner.desktopImage} />
                <img
                  className="hero-banner-image"
                  src={currentBanner.desktopImage || currentBanner.mobileImage}
                  alt={currentBanner.altText || currentBanner.title || "Avyona featured banner"}
                  fetchPriority="high"
                  onError={() => setFailedBannerMedia((current) => ({ ...current, [currentBanner.id]: true }))}
                />
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
          isExternalLink(safeButtonLink) ? (
            <a className="hero-banner-cta" href={safeButtonLink} target="_blank" rel="noreferrer">{currentButtonText}</a>
          ) : (
            <Link className="hero-banner-cta" to={safeButtonLink || "/collections"}>{currentButtonText}</Link>
          )
        ) : null}
      </section>

      {browseCategoriesSettings.enabled ? (
        <section className="section-block category-section">
          <div className="section-heading section-heading-centered">
            <div>
              <p className="eyebrow category-heading-tag">Browse</p>
              <h2>{browseCategoriesSettings.title}</h2>
              {browseCategoriesSettings.subtitle ? <p>{browseCategoriesSettings.subtitle}</p> : null}
            </div>
          </div>
          <div
            className="category-grid"
            style={{
              "--category-cards-per-row": browseCategoriesSettings.cardsPerRow,
              "--category-mobile-cards-per-row": browseCategoriesSettings.mobileCardsPerRow
            }}
          >
            {mainCategories.map((category) => {
              const homepageRule = getCategoryHomepageRule(category);
              const buttonText = homepageRule.homepageButtonText || "Explore Now";
              const buttonLink = homepageRule.homepageButtonLink || `/category/${category.slug}`;
              const categoryImage = resolveStorefrontMediaUrl(category.imageUrl || category.bannerImageUrl);

              return (
                <Link key={category.slug} className="category-card category-card-link" to={buttonLink}>
                  <div className="category-art">
                    <img src={categoryImage} alt={category.name} loading="lazy" decoding="async" onError={handleCategoryImageError} />
                  </div>
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
      ) : null}

      {ourProductsSettings.enabled ? (
        <section className="section-block spotlight-block">
          <div className="section-heading section-heading-centered">
            <div>
              <h3 className="section-title-large section-title-accent">{ourProductsSettings.title}</h3>
              {ourProductsSettings.subtitle ? <p>{ourProductsSettings.subtitle}</p> : null}
            </div>
          </div>
          <div
            className="product-grid homepage-dynamic-grid"
            style={{
              "--homepage-cards-per-row": ourProductsSettings.cardsPerRow,
              "--homepage-mobile-cards-per-row": ourProductsSettings.mobileCardsPerRow
            }}
          >
            {homepageOurProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} />)}
          </div>
        </section>
      ) : null}

      <section className="trust-section">
        <div className="section-heading section-heading-centered"><div><h4 className="section-title-medium">Why Shop With Avyona</h4></div></div>
        <div className="trust-grid">
          <article><span className="trust-icon" aria-hidden="true">&#10003;</span><strong>Genuine Products</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#8377;</span><strong>COD Available</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#128274;</span><strong>Secure Payments</strong></article>
          <article><span className="trust-icon" aria-hidden="true">&#9889;</span><strong>Fast Shipping</strong></article>
        </div>
      </section>

      {bestSellerProductsSettings.enabled ? (
        <section className="section-block">
          <div className="section-heading section-heading-centered catalog-heading">
            <div>
              <h4 className="section-title-medium">{bestSellerProductsSettings.title}</h4>
              {bestSellerProductsSettings.subtitle ? <p>{bestSellerProductsSettings.subtitle}</p> : null}
            </div>
          </div>
          <div className="catalog-tabs">
            {["all", ...bestSellerCategoryTabs.map((category) => category.slug)].map((categorySlug) => (
              <button key={categorySlug} className={`catalog-tab ${activeCategory === categorySlug ? "active" : ""}`} type="button" onClick={() => setActiveCategory(categorySlug)}>
                {categorySlug === "all" ? "All" : (bestSellerCategoryTabs.find((category) => category.slug === categorySlug)?.name || categorySlug)}
              </button>
            ))}
          </div>
          <div
            className="product-grid homepage-dynamic-grid"
            style={{
              "--homepage-cards-per-row": bestSellerProductsSettings.cardsPerRow,
              "--homepage-mobile-cards-per-row": bestSellerProductsSettings.mobileCardsPerRow
            }}
          >
            {homepageBestSellerProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} eyebrow="Best Seller / Trending" />)}
          </div>
        </section>
      ) : null}

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

      {newArrivalProductsSettings.enabled ? (
        <section className="section-block">
          <div className="section-heading section-heading-centered arrival-heading">
            <div>
              <p className="eyebrow">{newArrivalProductsSettings.title}</p>
              {newArrivalProductsSettings.subtitle ? <p>{newArrivalProductsSettings.subtitle}</p> : null}
            </div>
          </div>
          <div
            className="mini-grid homepage-dynamic-grid"
            style={{
              "--homepage-cards-per-row": newArrivalProductsSettings.cardsPerRow,
              "--homepage-mobile-cards-per-row": newArrivalProductsSettings.mobileCardsPerRow
            }}
          >
            {homepageNewArrivalProducts.map((product) => <ProductCard key={product.slug} product={product} context={context} eyebrow="New Arrival" />)}
          </div>
        </section>
      ) : null}

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
