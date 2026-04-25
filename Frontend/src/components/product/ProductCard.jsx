import React from "react";
import { Link } from "react-router-dom";
import { buildProductPath, formatCurrency } from "../../utils/storefront";

export default function ProductCard({ product, context, eyebrow, actionLabel = "Add to Cart", actionMode = "cart" }) {
  const firstVariant = product.variants?.[0];
  const ratingValue = Number(product.rating || 0);
  const ratingPercent = `${Math.max(0, Math.min(100, (ratingValue / 5) * 100))}%`;
  const productPath = buildProductPath(product, firstVariant);

  return (
    <article className="product-card">
      <span className="card-discount-badge">{product.discount}% OFF</span>
      <Link className="product-card-link" to={productPath}>
        <div className="product-art">
          <img src={product.image} alt={product.name} loading="lazy" />
        </div>
        <p className="product-topline">{eyebrow || product.brand}</p>
        <h3>{product.name}</h3>
        <p>{product.highlights?.[0] || product.feature}</p>
      </Link>
      <div className="product-card-footer">
        <div className="card-pricing">
          <div className="card-price-line">
            <strong>{formatCurrency(firstVariant?.price ?? product.price, context)}</strong>
            <span className="card-mrp">{formatCurrency(firstVariant?.mrp ?? product.mrp, context)}</span>
          </div>
          <span className="card-rating" aria-label={`${ratingValue.toFixed(1)} out of 5 stars`}>
            <span className="card-rating-stars" aria-hidden="true" style={{ "--rating-percent": ratingPercent }} />
            <span className="card-rating-value">{ratingValue.toFixed(1)}</span>
          </span>
        </div>
        {actionMode === "link" ? (
          <Link className="add-to-cart" to={productPath}>{actionLabel}</Link>
        ) : (
          <button className="add-to-cart" type="button" onClick={(event) => context.addToCart(product, firstVariant, 1, event.currentTarget)}>{actionLabel}</button>
        )}
      </div>
    </article>
  );
}
