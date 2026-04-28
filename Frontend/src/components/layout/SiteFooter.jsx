import React from "react";
import { Link } from "react-router-dom";
import { flattenCategoryTree } from "../../data/category-data";

export default function SiteFooter({ context }) {
  const siteSettings = context.siteSettings || {};
  const general = siteSettings.general || {};
  const tracking = siteSettings.tracking || {};
  const menuCategories = flattenCategoryTree(context.siteCategories || [])
    .filter((category) => category.showInMenu && category.status === "active" && !category.parentId)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    .slice(0, 6);

  return (
    <footer className="site-footer" id="support">
      <div className="container footer-grid">
        <div>
          <div className="brand-lockup footer-brand">
          <img className="brand-logo footer-logo" src={general.logoUrl || "/images/optimized/avyona-logo.webp"} alt={`${general.storeName || "Avyona"} logo`} loading="lazy" />
          </div>
          <p className="footer-copy">{general.brandTagline || "Curated premium electronic products from trusted domestic and global imported brands."}</p>
        </div>
        <div>
          <h3>Shop</h3>
          {menuCategories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`}>{category.name}</Link>
          ))}
        </div>
        <div>
          <h3>Support</h3>
          <Link to="/contact">Contact Us</Link>
          <Link to="/search">FAQ</Link>
          {tracking.trackingPageEnabled ? <Link to="/track-order">Track Order</Link> : null}
          <Link to="/checkout">Shipping Policy</Link>
          <Link to="/checkout">Return Policy</Link>
        </div>
        <div>
          <h3>Connect</h3>
          <a href={`tel:${(general.supportPhone || "+919876543210").replace(/\s+/g, "")}`}>{general.supportPhone || "+91 98765 43210"}</a>
          <a href={`mailto:${general.supportEmail || "support@avyona.com"}`}>{general.supportEmail || "support@avyona.com"}</a>
        </div>
      </div>
      <div className="container footer-trust">
        <span>Genuine Products</span>
        <span>COD Available</span>
        <span>Secure Payment</span>
        <span>Fast Delivery</span>
      </div>
    </footer>
  );
}
