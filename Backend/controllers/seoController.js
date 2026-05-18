import { query } from "../config/db.js";
import { env } from "../config/env.js";

const DEFAULT_DESCRIPTION = "Shop premium electronics from Avyona including personal audio, professional audio, digital cameras, security cameras, digital photo frames, reading lights, offers, and buying guides.";

function getSiteOrigin() {
  return String(env.siteUrl || env.frontendOrigin || "http://localhost:5173").replace(/\/+$/, "");
}

function toAbsoluteUrl(value = "") {
  if (!value) return `${getSiteOrigin()}/`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${getSiteOrigin()}${value.startsWith("/") ? value : `/${value}`}`;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function text(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncate(value, max = 160) {
  const normalized = text(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}...`;
}

function productPath(product) {
  const identifier = product.slug || product.asin || product.id;
  return `/product/${encodeURIComponent(identifier)}`;
}

function categoryPath(category) {
  return `/category/${encodeURIComponent(category.slug)}`;
}

function productDescription(product) {
  return truncate(product.metaDescription || product.description || product.shortDescription || `${product.brand} ${product.name} available at Avyona.`);
}

function productSchema(product) {
  const ratingValue = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0);
  const path = productPath(product);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [toAbsoluteUrl(product.imageUrl || "/images/optimized/frame-1.webp")],
    description: productDescription(product),
    sku: product.sku || product.asin,
    mpn: product.modelNumber || product.sku || product.asin,
    brand: {
      "@type": "Brand",
      name: product.brand
    },
    category: product.categoryName || "Products",
    offers: {
      "@type": "Offer",
      url: toAbsoluteUrl(path),
      priceCurrency: product.currency || "INR",
      price: Number(product.price || 0),
      availability: Number(product.stockQuantity || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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

function pageSchema(title, path, description) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: toAbsoluteUrl(path),
    description
  };
}

function categoryPageSchema(category, path, products = []) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: truncate(category.metaDescription || category.description || DEFAULT_DESCRIPTION),
    url: toAbsoluteUrl(path),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: toAbsoluteUrl(productPath(product))
      }))
    }
  };
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Avyona",
    url: getSiteOrigin(),
    logo: toAbsoluteUrl("/images/optimized/avyona-logo.webp")
  };
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Avyona",
    url: getSiteOrigin(),
    potentialAction: {
      "@type": "SearchAction",
      target: `${getSiteOrigin()}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

async function getProductByIdentifier(identifier) {
  const numericId = Number(identifier);
  const values = Number.isInteger(numericId) && numericId > 0
    ? [numericId, identifier, identifier]
    : [identifier, identifier];
  const where = Number.isInteger(numericId) && numericId > 0
    ? "(p.id = ? OR p.slug = ? OR p.asin = ?)"
    : "(p.slug = ? OR p.asin = ?)";

  const rows = await query(
    `SELECT
      p.id,
      p.asin,
      p.sku,
      p.model_number AS modelNumber,
      p.name,
      p.slug,
      p.brand,
      p.short_description AS shortDescription,
      p.description,
      p.price,
      p.mrp,
      p.currency,
      p.stock_quantity AS stockQuantity,
      p.rating,
      p.review_count AS reviewCount,
      p.image_url AS imageUrl,
      p.updated_at AS updatedAt,
      c.name AS categoryName,
      c.slug AS categorySlug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where}
       AND p.status = 'active'
       AND p.is_visible = 1
       AND p.is_deleted = 0
     LIMIT 1`,
    values
  );

  return rows[0] || null;
}

async function getCategoryBySlug(slug) {
  const rows = await query(
    `SELECT
      id,
      name,
      slug,
      description,
      image_url AS imageUrl,
      banner_image_url AS bannerImageUrl,
      meta_title AS metaTitle,
      meta_description AS metaDescription,
      meta_keywords AS metaKeywords,
      updated_at AS updatedAt
     FROM categories
     WHERE slug = ?
       AND status = 'active'
       AND is_active = 1
     LIMIT 1`,
    [slug]
  );

  return rows[0] || null;
}

async function getCategoryProducts(categoryId) {
  return query(
    `SELECT slug, asin, id
     FROM products
     WHERE category_id = ?
       AND status = 'active'
       AND is_visible = 1
       AND is_deleted = 0
     ORDER BY updated_at DESC, name ASC
     LIMIT 100`,
    [categoryId]
  );
}

function sendSeo(response, seo) {
  response.json({
    success: true,
    data: {
      ...seo,
      canonical: toAbsoluteUrl(seo.path),
      image: toAbsoluteUrl(seo.image || "/images/optimized/banner-1.webp")
    }
  });
}

export async function getPageSeo(request, response) {
  const pathname = String(request.query.path || "/").split("?")[0] || "/";
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "product" && segments[1]) {
    const product = await getProductByIdentifier(decodeURIComponent(segments[1]));
    if (product) {
      const path = productPath(product);
      const description = productDescription(product);
      sendSeo(response, {
        title: `${product.name} | Avyona`,
        description,
        keywords: [product.name, product.brand, product.categoryName, product.sku, product.asin, product.modelNumber].filter(Boolean).join(", "),
        robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        path,
        image: product.imageUrl,
        type: "product",
        schema: [
          organizationSchema(),
          pageSchema(`${product.name} | Avyona`, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: product.categoryName || "Collections", path: product.categorySlug ? `/category/${product.categorySlug}` : "/collections" },
            { name: product.name, path }
          ]),
          productSchema(product)
        ]
      });
      return;
    }
  }

  if (segments[0] === "category" && segments[1]) {
    const category = await getCategoryBySlug(decodeURIComponent(segments[1]));
    if (category) {
      const path = categoryPath(category);
      const description = truncate(category.metaDescription || category.description || DEFAULT_DESCRIPTION);
      const products = await getCategoryProducts(category.id);
      sendSeo(response, {
        title: category.metaTitle || `${category.name} | Avyona`,
        description,
        keywords: category.metaKeywords || `${category.name}, Avyona electronics`,
        robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        path,
        image: category.bannerImageUrl || category.imageUrl,
        type: "website",
        schema: [
          organizationSchema(),
          pageSchema(category.metaTitle || `${category.name} | Avyona`, path, description),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: category.name, path }
          ]),
          categoryPageSchema(category, path, products)
        ]
      });
      return;
    }
  }

  if (pathname === "/contact-us") {
    const title = "Contact Us | Avyona";
    const description = "Need help with an order or business enquiry? Contact Avyona for customer support, delivery help, warranty support, bulk orders, dealership, partnerships, and corporate enquiries.";

    sendSeo(response, {
      title,
      description,
      keywords: "Avyona contact, customer support, business enquiry, bulk orders, warranty support",
      robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      path: "/contact-us",
      image: "/images/optimized/banner-1.webp",
      type: "website",
      schema: [
        organizationSchema(),
        pageSchema(title, "/contact-us", description),
        breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Contact Us", path: "/contact-us" }
        ])
      ]
    });
    return;
  }

  sendSeo(response, {
    title: "Avyona | Premium Electronics for Everyday Life",
    description: DEFAULT_DESCRIPTION,
    keywords: "Avyona, premium electronics, personal audio, cameras, digital photo frames",
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    path: pathname,
    image: "/images/optimized/banner-1.webp",
    type: "website",
    schema: [organizationSchema(), websiteSchema(), pageSchema("Avyona | Premium Electronics for Everyday Life", pathname, DEFAULT_DESCRIPTION)]
  });
}

async function getSitemapUrls() {
  const now = new Date().toISOString();
  const staticUrls = [
    { loc: "/", priority: "1.0", changefreq: "daily", lastmod: now },
    { loc: "/collections", priority: "0.8", changefreq: "weekly", lastmod: now },
    { loc: "/contact-us", priority: "0.5", changefreq: "monthly", lastmod: now },
    { loc: "/track-order", priority: "0.3", changefreq: "monthly", lastmod: now }
  ];
  const [products, categories] = await Promise.all([
    query(
      `SELECT slug, asin, updated_at AS updatedAt
       FROM products
       WHERE status = 'active' AND is_visible = 1 AND is_deleted = 0
       ORDER BY updated_at DESC
       LIMIT 50000`
    ),
    query(
      `SELECT slug, updated_at AS updatedAt
       FROM categories
       WHERE status = 'active' AND is_active = 1
       ORDER BY sort_order ASC, name ASC
       LIMIT 5000`
    )
  ]);

  return [
    ...staticUrls,
    ...categories.map((category) => ({
      loc: categoryPath(category),
      priority: "0.7",
      changefreq: "weekly",
      lastmod: new Date(category.updatedAt || now).toISOString()
    })),
    ...products.map((product) => ({
      loc: productPath(product),
      priority: "0.9",
      changefreq: "weekly",
      lastmod: new Date(product.updatedAt || now).toISOString()
    }))
  ];
}

export async function getSitemapXml(_request, response) {
  const urls = await getSitemapUrls();
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url>\n    <loc>${escapeXml(toAbsoluteUrl(url.loc))}</loc>\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n    <changefreq>${escapeXml(url.changefreq)}</changefreq>\n    <priority>${escapeXml(url.priority)}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;

  response.type("application/xml").send(body);
}

export function getRobotsTxt(_request, response) {
  response.type("text/plain").send([
    "User-agent: *",
    "Allow: /",
    "Disallow: /account",
    "Disallow: /profile",
    "Disallow: /checkout",
    `Sitemap: ${env.sitemapUrl}`,
    ""
  ].join("\n"));
}
