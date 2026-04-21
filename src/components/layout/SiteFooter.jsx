import React from "react";
import { Link } from "react-router-dom";

export default function SiteFooter({ context }) {
  return (
    <footer className="site-footer" id="support">
      <div className="container footer-grid">
        <div>
          <div className="brand-lockup footer-brand">
          <img className="brand-logo footer-logo" src="/images/optimized/avyona-logo.webp" alt="Avyona logo" loading="lazy" />
          </div>
          <p className="footer-copy">Curated premium electronic products from trusted domestic and global imported brands.</p>
        </div>
        <div>
          <h3>Shop</h3>
          <Link to="/collection/personal-audio">Personal Audio</Link>
          <Link to="/collection/professional-audio">Professional Audio</Link>
          <Link to="/collection/digital-camera">Digital Camera</Link>
          <Link to="/collection/security-camera">Security Camera</Link>
          <Link to="/collection/digital-photo-frames">Digital Photo Frames</Link>
          <Link to="/collection/reading-light">Reading Light</Link>
        </div>
        <div>
          <h3>Support</h3>
          <Link to="/account">Contact Us</Link>
          <Link to="/search">FAQ</Link>
          <Link to={context?.authUser ? "/profile" : "/account"}>Track Order</Link>
          <Link to="/checkout">Shipping Policy</Link>
          <Link to="/checkout">Return Policy</Link>
        </div>
        <div>
          <h3>Connect</h3>
          <a href="tel:+919876543210">+91 98765 43210</a>
          <a href="mailto:support@avyona.example">support@avyona.example</a>
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
