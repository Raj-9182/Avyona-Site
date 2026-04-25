import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { compressImageFile, formatCurrency, getMergedProfile, getOptimizedAssetPath } from "../utils/storefront";

export default function ProfilePage({ context }) {
  const navigate = useNavigate();
  const merged = getMergedProfile(context.authUser, context.customerProfile);
  const [profile, setProfile] = useState(merged);

  useEffect(() => {
    setProfile(getMergedProfile(context.authUser, context.customerProfile));
  }, [context.authUser, context.customerProfile]);

  useEffect(() => {
    document.body.classList.add("profile-page");
    return () => document.body.classList.remove("profile-page");
  }, []);

  if (!context.authUser) return <Navigate to="/account" replace />;

  const saveProfile = (event) => {
    event.preventDefault();
    const parts = profile.fullName.split(/\s+/);
    context.setCustomerProfile({
      ...context.customerProfile,
      firstName: parts.slice(0, 1).join(" "),
      lastName: parts.slice(1).join(" "),
      email: profile.email,
      phone: profile.mobile,
      address: profile.address,
      image: profile.image
    });
    context.notify("Profile saved");
  };

  const updateProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await compressImageFile(file);
      setProfile((current) => ({ ...current, image }));
      context.setCustomerProfile({
        ...context.customerProfile,
        image
      });
      context.notify("Profile image updated");
    } catch {
      context.notify("Could not update profile image");
    }
  };

  return (
    <main className="container profile-main">
      <section className="profile-shell">
        <div className="profile-hero">
          <Link className="profile-brand" to="/" aria-label="Avyona home"><img src={getOptimizedAssetPath("/images/avyona logo.png")} alt="Avyona logo" /></Link>
          <div className="profile-hero-copy"><p className="eyebrow">My Account</p><h1>{`Welcome back, ${profile.fullName.split(" ")[0] || "Customer"}`}</h1><p>Manage your profile, latest offers, orders, and saved cart details in one place.</p></div>
          <div className="profile-hero-actions">
            <Link className="secondary-button" to="/">Continue Shopping</Link>
            <button className="primary-button" type="button" onClick={() => { context.setAuthUser(null); navigate("/account"); }}>Logout</button>
          </div>
        </div>
        <section className="profile-layout">
          <aside className="profile-card profile-identity-card">
            <div className="profile-avatar-wrap">
              <img className="profile-avatar" src={profile.image} alt="Profile avatar" />
              <label className="profile-avatar-edit" htmlFor="profileImageInput">Edit Photo</label>
              <input id="profileImageInput" type="file" accept="image/*" hidden onChange={updateProfileImage} />
            </div>
            <form className="profile-form" onSubmit={saveProfile}>
              <div className="profile-form-grid">
                <label className="profile-field"><span>Full Name</span><input value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} required /></label>
                <label className="profile-field"><span>Email Address</span><input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
                <label className="profile-field"><span>Mobile Number</span><input value={profile.mobile} onChange={(event) => setProfile({ ...profile, mobile: event.target.value })} /></label>
                <label className="profile-field"><span>Default Address</span><textarea rows="4" value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
              </div>
              <div className="profile-form-actions"><button className="primary-button" type="submit">Save Profile</button></div>
            </form>
          </aside>
          <div className="profile-content">
            <section className="profile-card"><div className="profile-section-head"><div><p className="eyebrow">Deals & Offers</p><h2>Recommended for you</h2></div></div><div className="profile-offers-grid">{["Profile Member Deal", "Free Shipping", "Wishlist Offer"].map((offer) => <article key={offer} className="offer-card"><span className="offer-badge">Live</span><h3>{offer}</h3><p>Exclusive Avyona savings tailored for returning shoppers.</p></article>)}</div></section>
            <section className="profile-card"><div className="profile-section-head"><div><p className="eyebrow">My Orders</p><h2>Recent purchases</h2></div></div><div className="profile-list">{context.orders.length ? context.orders.map((order, index) => <article key={`${order.slug}:${index}`} className="profile-item"><img src={order.image || getOptimizedAssetPath("/images/Frame 2.png")} alt={order.name} /><div className="profile-item-copy"><h3>{order.name}</h3><p>{order.category}</p><div className="profile-order-meta"><span>{order.date}</span><span>{order.status}</span><span>{`Qty: ${order.quantity}`}</span></div></div><strong className="profile-item-price">{formatCurrency(order.total)}</strong></article>) : <div className="profile-empty"><h3>No orders yet</h3><p>Your completed purchases will appear here once you place an order.</p></div>}</div></section>
            <section className="profile-card"><div className="profile-section-head"><div><p className="eyebrow">Wishlist</p><h2>Saved products</h2></div></div><div className="profile-list">{context.wishlist.length ? context.wishlist.map((item) => <article key={`${item.slug}:${item.variantLabel || ""}`} className="profile-item"><img src={item.image || getOptimizedAssetPath("/images/Frame 2.png")} alt={item.name} /><div className="profile-item-copy"><h3>{item.name}</h3><p>{item.category}{item.variantLabel ? ` | ${item.variantLabel}` : ""}</p><span>Saved to wishlist</span></div><strong className="profile-item-price">{formatCurrency(item.price)}</strong></article>) : <div className="profile-empty"><h3>No wishlist items</h3><p>Your saved products will appear here when you add them from any product page.</p></div>}</div></section>
            <section className="profile-card"><div className="profile-section-head"><div><p className="eyebrow">Cart</p><h2>Added to Cart</h2></div></div><div className="profile-list">{context.cart.length ? context.cart.map((item) => <article key={`${item.slug}:${item.variantLabel || ""}`} className="profile-item"><img src={item.image || getOptimizedAssetPath("/images/Frame 2.png")} alt={item.name} /><div className="profile-item-copy"><h3>{item.name}</h3><p>{item.category}{item.variantLabel ? ` | ${item.variantLabel}` : ""}</p><span>{`Qty: ${item.quantity}`}</span></div><strong className="profile-item-price">{formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}</strong></article>) : <div className="profile-empty"><h3>No cart items</h3><p>Your added products will appear here before checkout.</p></div>}</div></section>
          </div>
        </section>
      </section>
    </main>
  );
}
