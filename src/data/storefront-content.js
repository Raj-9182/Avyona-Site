import { productData as rawProductData } from "./product-data";
import { collectionData as rawCollectionData } from "./collection-data";
import { getOptimizedAssetPath } from "../utils/storefront";

export const categoryRouteMap = {
  "personal-audio": "/collection/personal-audio",
  "professional-audio": "/collection/professional-audio",
  "digital-camera": "/collection/digital-camera",
  "security-camera": "/collection/security-camera",
  "digital-photo-frames": "/collection/digital-photo-frames",
  "reading-light": "/collection/reading-light"
};

export const offerConfigs = {
  "summer-sale": {
    title: "Summer Sale",
    eyebrow: "Season Picks",
    description: "Fresh summer savings on audio, cameras, and travel-ready picks.",
    coupon: "SUMMER15",
    image: "/images/summer sale.jpg",
    heading: "Summer Sale Products",
    matches: (product) => ["Personal Audio", "Digital Camera", "Reading Light"].includes(product.category)
  },
  "first-purchase": {
    title: "On Your First Purchase",
    eyebrow: "New Shopper Offer",
    description: "Unlock an easy first-order deal across Avyona best sellers and everyday favorites.",
    coupon: "FIRST12",
    image: "/images/on your first order.jpg",
    heading: "First Purchase Eligible Products",
    matches: (product) => product.stockTone !== "out-of-stock"
  },
  "bundle-sale": {
    title: "Bundle Sale",
    eyebrow: "Save More Together",
    description: "Build a better setup with bundle pricing on selected collections and home-ready products.",
    coupon: "BUNDLE20",
    image: "/images/Bundle sale.jpg",
    heading: "Bundle Sale Products",
    matches: (product) => ["Avyona Digital Photo Frames", "Professional Audio", "Security Camera"].includes(product.category)
  }
};

export const homeBanners = [
  "/images/optimized/banner-1.webp",
  "/images/optimized/banner-2.webp",
  "/images/optimized/banner-3.webp",
  "/images/optimized/banner-4.webp"
];

export const blogEntries = [
  {
    image: "/images/optimized/blog-1.webp",
    title: "Best Digital Photo Frames for Family Memories",
    body: "How to choose the right frame for gifting, shared albums, and long-term display quality."
  },
  {
    image: "/images/optimized/blog-2.webp",
    title: "How to Pick Personal Audio Gear for Work, Travel, and Fitness",
    body: "A simple guide to matching listening style, battery life, and comfort to your routine."
  },
  {
    image: "/images/optimized/blog-3.webp",
    title: "What to Look for Before Buying a Compact Digital Camera",
    body: "Sensor basics, portability, use cases, and why trusted brands still matter for capture quality."
  }
];

export const featuredBrands = ["sony", "KODAK", "JBL", "AKG", "WYZE", "GLOCUENT"];

function normalizeAssetPaths(value) {
  if (Array.isArray(value)) return value.map(normalizeAssetPaths);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entryValue]) => [key, normalizeAssetPaths(entryValue)]));
  }
  if (typeof value === "string" && value.startsWith("images/")) return getOptimizedAssetPath(value);
  return value;
}

export const productData = normalizeAssetPaths(rawProductData);
export const collectionData = normalizeAssetPaths(rawCollectionData);
export const allProducts = Object.values(productData);
export const featuredProducts = allProducts.slice(0, 8);
export const arrivalProducts = [...allProducts].sort((left, right) => right.rating - left.rating).slice(0, 4);
export const frameProducts = allProducts.filter((product) => product.collectionSlug === "digital-photo-frames");
