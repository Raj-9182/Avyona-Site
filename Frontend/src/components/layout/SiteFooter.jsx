import React from "react";
import { Link } from "react-router-dom";
import { flattenCategoryTree } from "../../data/category-data";

export default function SiteFooter({ context }) {
  const siteSettings = context.siteSettings || {};
  const general = siteSettings.general || {};
  const tracking = siteSettings.tracking || {};
  const supportPhone = general.supportPhone || "";
  const supportEmail = general.supportEmail || "support@avyona.com";
  const menuCategories = flattenCategoryTree(context.siteCategories || [])
    .filter((category) => category.showInMenu && category.status === "active" && !category.parentId)
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    .slice(0, 6);

  return (
    <footer className="site-footer" id="support">
      <div className="container footer-grid">
        <div>
          <div className="brand-lockup footer-brand">
            {general.logoUrl ? <img className="brand-logo footer-logo" src={general.logoUrl} alt={`${general.storeName || "Avyona"} logo`} loading="lazy" /> : <span className="brand-text">{general.storeName || "Avyona"}</span>}
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
          <Link to="/contact-us">Contact Us</Link>
          <Link to="/search">FAQ</Link>
          {tracking.trackingPageEnabled ? <Link to="/track-order">Track Order</Link> : null}
          <Link to="/checkout">Shipping Policy</Link>
          <Link to="/checkout">Return Policy</Link>
        </div>
        <div>
          <h3>Connect</h3>
          {supportPhone ? <a href={`tel:${supportPhone.replace(/\s+/g, "")}`}>{supportPhone}</a> : null}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          {general.workingHours ? <span>{general.workingHours}</span> : null}
          {general.businessAddress ? <span>{general.businessAddress}</span> : null}
          {general.gstNumber ? <span>{`GST: ${general.gstNumber}`}</span> : null}
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
