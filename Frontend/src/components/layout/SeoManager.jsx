import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { flattenCategoryTree, fallbackCategoryTree } from "../../data/category-data";
import {
  blogEntries,
  blogEntriesBySlug,
  collectionData,
  getProductByIdentifier,
  offerConfigs,
  productData
} from "../../data/storefront-content";
import { buildProductPath, getOptimizedAssetPath, getProductVariantByKey } from "../../utils/storefront";

const SITE_NAME = "Avyona";
const DEFAULT_TITLE = "Avyona | Premium Electronics for Everyday Life";
const DEFAULT_DESCRIPTION = "Shop premium electronics from Avyona including personal audio, professional audio, digital cameras, security cameras, digital photo frames, reading lights, offers, and buying guides.";
const DEFAULT_KEYWORDS = [
  "Avyona",
  "premium electronics",
  "personal audio",
  "professional audio",
  "digital cameras",
  "security cameras",
  "digital photo frames",
  "reading lights",
  "electronics store India"
].join(", ");

function getSiteOrigin() {
  const configuredUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SITE_URL : "";
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "https://www.avyona.com";
}

function toAbsoluteUrl(value = "") {
  if (!value) return `${getSiteOrigin()}/`;
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${getSiteOrigin()}${normalized}`;
}

function ensureImage(value) {
  return toAbsoluteUrl(getOptimizedAssetPath(value || "/images/avyona logo.png"));
}

function plainText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, max = 160) {
  const normalized = plainText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
}

function productDescription(product) {
  return truncate([
    product.description?.[0],
    product.highlights?.[0],
    `${product.brand} ${product.category} available at Avyona.`
  ].filter(Boolean).join(" "));
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path)
    }))
  };
}

function organizationSchema() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: origin,
    logo: toAbsoluteUrl("/images/optimized/avyona-logo.webp")
  };
}

function websiteSchema() {
  const origin = getSiteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: origin,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

function collectionItemListSchema(name, path, products) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url: toAbsoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: toAbsoluteUrl(buildProductPath(product, product.variants?.[0]))
      }))
    }
  };
}

function categoryPageSchema(category, path, products) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: truncate(category.metaDescription || category.description || ""),
    url: toAbsoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: toAbsoluteUrl(buildProductPath(product, product.variants?.[0]))
      }))
    }
  };
}

function productSchema(product, variant) {
  const ratingValue = Number(product.rating || product.reviewSummary?.average || 0);
  const reviewCount = Number(product.reviewCount || product.reviewSummary?.count || 0);
  const canonicalPath = buildProductPath(product, variant);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: variant ? `${product.name} - ${variant.label}` : product.name,
    image: [ensureImage(variant?.image || product.image)],
    description: productDescription(product),
    sku: product.sku,
    brand: {
      "@type": "Brand",
      name: product.brand
    },
    category: product.category,
    offers: {
      "@type": "Offer",
      url: toAbsoluteUrl(canonicalPath),
      priceCurrency: "INR",
      price: Number(variant?.price ?? product.price ?? 0),
      availability: (variant?.stockTone || product.stockTone) === "out-of-stock"
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition"
    },
    ...(ratingValue > 0 && reviewCount > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        reviewCount
      }
    } : {})
  };
}

function articleSchema(article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: truncate(article.intro || article.body),
    image: [ensureImage(article.image)],
    author: {
      "@type": "Organization",
      name: SITE_NAME
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: toAbsoluteUrl("/images/optimized/avyona-logo.webp")
      }
    },
    mainEntityOfPage: toAbsoluteUrl(`/blog/${article.slug}`)
  };
}

function pageSchema(title, path, description) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: toAbsoluteUrl(path),
    description
  };
}

function setMeta({ name, property, content }) {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    if (name) element.setAttribute("name", name);
    if (property) element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setSchemaMarkup(schemaList) {
  const scriptId = "seo-schema-markup";
  const existing = document.getElementById(scriptId);
  if (existing) existing.remove();

  if (!schemaList.length) return;

  const script = document.createElement("script");
  script.id = scriptId;
  script.type = "application/ld+json";
  script.text = JSON.stringify(schemaList.length === 1 ? schemaList[0] : schemaList);
  document.head.appendChild(script);
}

function getSeoData(location) {
  const { pathname, search } = location;
  const searchParams = new URLSearchParams(search);
  const pathSegments = pathname.split("/").filter(Boolean);
  const categories = flattenCategoryTree(fallbackCategoryTree);
  const base = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    keywords: DEFAULT_KEYWORDS,
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    canonical: toAbsoluteUrl(pathname === "/" ? "/" : pathname),
    image: ensureImage("/images/optimized/banner-1.webp"),
    type: "website",
    schema: [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema([{ name: "Home", path: "/" }]),
      pageSchema(DEFAULT_TITLE, "/", DEFAULT_DESCRIPTION)
    ]
  };

  if (pathname === "/") {
    return {
      ...base,
      schema: [
        organizationSchema(),
        websiteSchema(),
        pageSchema(DEFAULT_TITLE, "/", DEFAULT_DESCRIPTION),
        breadcrumbSchema([{ name: "Home", path: "/" }]),
        collectionItemListSchema("Featured products", "/", Object.values(productData).slice(0, 8))
      ]
    };
  }

  if (pathname === "/collections") {
    const title = "Avyona | All Collections";
    const description = "Explore all Avyona collections across personal audio, professional audio, cameras, frames, security devices, and reading lights.";
    const products = Object.values(productData);
    return {
      ...base,
      title,
      description,
      keywords: `${DEFAULT_KEYWORDS}, electronics collections, Avyona collections`,
      canonical: toAbsoluteUrl("/collections"),
      image: ensureImage("/images/optimized/banner-2.webp"),
      type: "website",
      schema: [
        organizationSchema(),
        pageSchema(title, "/collections", description),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" }
        ]),
        collectionItemListSchema("Avyona Collections", "/collections", products)
      ]
    };
  }

  if (pathSegments[0] === "collection" && pathSegments[1]) {
    const collection = collectionData[pathSegments[1]];
    if (collection) {
      const products = (collection.products || []).map((item) => productData[item.slug]).filter(Boolean);
      const title = `Avyona | ${collection.title}`;
      const description = truncate(collection.description);
      const path = `/collection/${pathSegments[1]}`;
      return {
        ...base,
        title,
        description,
        keywords: `${DEFAULT_KEYWORDS}, ${collection.title}, ${collection.title.toLowerCase()}`,
        canonical: toAbsoluteUrl(path),
        image: ensureImage(collection.bannerImage),
        type: "website",
        schema: [
          organizationSchema(),
          pageSchema(title, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collection.title, path }
          ]),
          collectionItemListSchema(collection.title, path, products)
        ]
      };
    }
  }

  if (pathSegments[0] === "category" && pathSegments[1]) {
    const category = categories.find((item) => item.slug === pathSegments[1] && item.status === "active");

    if (category) {
      const path = `/category/${category.slug}`;
      const products = Object.values(productData).filter((product) => {
        if (Array.isArray(category.productSlugs) && category.productSlugs.includes(product.slug)) return true;
        return !category.parentId && product.collectionSlug === category.slug;
      });
      const title = category.metaTitle || `${SITE_NAME} | ${category.name}`;
      const description = truncate(category.metaDescription || category.description || DEFAULT_DESCRIPTION);

      return {
        ...base,
        title,
        description,
        keywords: category.keywords ? `${DEFAULT_KEYWORDS}, ${category.keywords}` : DEFAULT_KEYWORDS,
        canonical: toAbsoluteUrl(path),
        image: ensureImage(category.bannerImageUrl || category.imageUrl),
        type: "website",
        schema: [
          organizationSchema(),
          pageSchema(title, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: category.name, path }
          ]),
          categoryPageSchema(category, path, products)
        ]
      };
    }
  }

  if (pathSegments[0] === "product" && pathSegments[1]) {
    const product = getProductByIdentifier(pathSegments[1]);
    if (product) {
      const variant = getProductVariantByKey(product, pathSegments[2]);
      const path = buildProductPath(product, variant);
      const description = productDescription(product);
      const title = variant ? `Avyona | ${product.name} - ${variant.label}` : `Avyona | ${product.name}`;
      return {
        ...base,
        title,
        description,
        keywords: `${DEFAULT_KEYWORDS}, ${product.name}, ${product.brand}, ${product.category}${variant ? `, ${variant.label}` : ""}`,
        canonical: toAbsoluteUrl(path),
        image: ensureImage(variant?.image || product.image),
        type: "product",
        schema: [
          organizationSchema(),
          pageSchema(title, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: product.category, path: `/category/${product.collectionSlug}` },
            { name: variant ? `${product.name} - ${variant.label}` : product.name, path }
          ]),
          productSchema(product, variant)
        ]
      };
    }
  }

  if (pathname === "/offers") {
    const offerKey = searchParams.get("offer") || "summer-sale";
    const offer = offerConfigs[offerKey] || offerConfigs["summer-sale"];
    const description = truncate(`${offer.description} Use coupon ${offer.coupon} on eligible Avyona products.`);
    const canonical = toAbsoluteUrl(offerKey ? `/offers?offer=${offerKey}` : "/offers");
    return {
      ...base,
      title: `Avyona | ${offer.title}`,
      description,
      keywords: `${DEFAULT_KEYWORDS}, ${offer.title}, electronics offers, coupon deals`,
      canonical,
      image: ensureImage(offer.image),
      type: "website",
      schema: [
        organizationSchema(),
        pageSchema(`Avyona | ${offer.title}`, `/offers?offer=${offerKey}`, description),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Offers", path: "/offers" }
        ])
      ]
    };
  }

  if (pathSegments[0] === "blog" && pathSegments[1]) {
    const article = blogEntriesBySlug[pathSegments[1]];
    if (article) {
      const path = `/blog/${article.slug}`;
      const description = truncate(article.intro || article.body);
      return {
        ...base,
        title: `Avyona | ${article.title}`,
        description,
        keywords: `${DEFAULT_KEYWORDS}, Avyona blog, ${article.category}, ${article.title}`,
        canonical: toAbsoluteUrl(path),
        image: ensureImage(article.image),
        type: "article",
        schema: [
          organizationSchema(),
          pageSchema(`Avyona | ${article.title}`, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/" },
            { name: article.title, path }
          ]),
          articleSchema(article)
        ]
      };
    }
  }

  if (pathname === "/search") {
    const query = plainText(searchParams.get("q") || "");
    const title = query ? `Avyona | Search: ${query}` : "Avyona | Search";
    const description = query
      ? truncate(`Search results for ${query} across Avyona electronics products.`)
      : "Search Avyona products by category, brand, and keywords.";
    return {
      ...base,
      title,
      description,
      robots: "noindex, follow",
      canonical: toAbsoluteUrl(query ? `/search?q=${encodeURIComponent(query)}` : "/search"),
      type: "website",
      schema: [
        pageSchema(title, query ? `/search?q=${encodeURIComponent(query)}` : "/search", description),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Search", path: query ? `/search?q=${encodeURIComponent(query)}` : "/search" }
        ])
      ]
    };
  }

  if (pathname === "/account") {
    const title = "Avyona Account";
    const description = "Login or create your Avyona account to manage profile, orders, and saved shopping details.";
    return {
      ...base,
      title,
      description,
      robots: "noindex, nofollow, noarchive",
      canonical: toAbsoluteUrl("/account"),
      schema: [pageSchema(title, "/account", description)]
    };
  }

  if (pathname === "/profile") {
    const title = "Avyona Profile";
    const description = "Manage your Avyona profile, saved products, orders, and shopping preferences.";
    return {
      ...base,
      title,
      description,
      robots: "noindex, nofollow, noarchive",
      canonical: toAbsoluteUrl("/profile"),
      schema: [pageSchema(title, "/profile", description)]
    };
  }

  if (pathname === "/checkout") {
    const title = "Avyona | Checkout";
    const description = "Secure checkout for your Avyona order with delivery, payment, and billing details.";
    return {
      ...base,
      title,
      description,
      robots: "noindex, nofollow, noarchive",
      canonical: toAbsoluteUrl("/checkout"),
      schema: [pageSchema(title, "/checkout", description)]
    };
  }

  const blogListDescription = `Read the latest Avyona buying guides and electronics insights across ${blogEntries.length} featured articles.`;
  return {
    ...base,
    schema: [
      organizationSchema(),
      websiteSchema(),
      pageSchema(DEFAULT_TITLE, pathname || "/", blogListDescription)
    ]
  };
}

export default function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const seo = getSeoData(location);
    document.title = seo.title;
    setCanonical(seo.canonical);

    setMeta({ name: "description", content: seo.description });
    setMeta({ name: "robots", content: seo.robots });
    setMeta({ name: "keywords", content: seo.keywords });
    setMeta({ name: "author", content: SITE_NAME });
    setMeta({ name: "application-name", content: SITE_NAME });
    setMeta({ name: "theme-color", content: "#5db467" });

    setMeta({ property: "og:site_name", content: SITE_NAME });
    setMeta({ property: "og:locale", content: "en_IN" });
    setMeta({ property: "og:type", content: seo.type });
    setMeta({ property: "og:title", content: seo.title });
    setMeta({ property: "og:description", content: seo.description });
    setMeta({ property: "og:url", content: seo.canonical });
    setMeta({ property: "og:image", content: seo.image });

    setMeta({ name: "twitter:card", content: "summary_large_image" });
    setMeta({ name: "twitter:title", content: seo.title });
    setMeta({ name: "twitter:description", content: seo.description });
    setMeta({ name: "twitter:image", content: seo.image });

    setSchemaMarkup(seo.schema);
  }, [location]);

  return null;
}
