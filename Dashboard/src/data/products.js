import { allProducts, featuredProducts } from "./storefront-content";

const featuredSlugs = new Set(featuredProducts.map((product) => product.slug));

function getStockDetails(product) {
  const variantStocks = Array.isArray(product.variants)
    ? product.variants.map((variant) => Number(variant.availableStock || 0))
    : [];

  const stock = variantStocks.length
    ? variantStocks.reduce((sum, value) => sum + value, 0)
    : Number(product.availableStock || 0);

  let stockStatus = "in-stock";
  if (stock <= 0) stockStatus = "out-of-stock";
  else if (stock <= 5) stockStatus = "low-stock";

  return { stock, stockStatus };
}

const products = allProducts.map((product, index) => {
  const { stock, stockStatus } = getStockDetails(product);

  return {
    id: index + 1,
    slug: product.slug,
    image: product.image,
    name: product.name,
    brand: product.brand,
    category: product.category,
    sku: product.sku,
    price: Number(product.price || 0),
    stock,
    stockStatus,
    status: product.stockTone === "out-of-stock" ? "inactive" : "active",
    featured: featuredSlugs.has(product.slug)
  };
});

export default products;
