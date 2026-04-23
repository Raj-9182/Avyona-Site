import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  formatCurrency,
  getCheckoutPaymentMethods,
  getCheckoutShippingOptions,
  getMergedProfile,
  getOptimizedAssetPath
} from "../utils/storefront";

export default function CheckoutPage({ context }) {
  const navigate = useNavigate();
  const siteSettings = context.siteSettings || {};
  const general = siteSettings.general || {};
  const paymentSettings = siteSettings.payment || {};
  const shippingSettings = siteSettings.shipping || {};
  const paymentIcons = [
    getOptimizedAssetPath("/images/payment 1.png"),
    getOptimizedAssetPath("/images/payment 2.png"),
    getOptimizedAssetPath("/images/payment 3.png"),
    getOptimizedAssetPath("/images/payment 4.png")
  ];
  const shippingOptions = getCheckoutShippingOptions(context);
  const paymentMethods = getCheckoutPaymentMethods(context);
  const mergedProfile = getMergedProfile(context.authUser, context.customerProfile);
  const [savedFirstName = "", ...savedLastParts] = mergedProfile.fullName.split(/\s+/).filter(Boolean);
  const savedLastName = savedLastParts.join(" ");
  const [form, setForm] = useState({
    contact: context.customerProfile.contact || mergedProfile.email || "",
    firstName: context.customerProfile.firstName || savedFirstName,
    lastName: context.customerProfile.lastName || savedLastName,
    address1: context.customerProfile.address || "",
    address2: "",
    companyName: "",
    city: "",
    state: "Telangana",
    pinCode: String(context.customerProfile.address || "").match(/\b(\d{6})\b/)?.[1] || "",
    phone: mergedProfile.mobile || "",
    shippingMethod: shippingOptions[0]?.id || "standard",
    paymentMethod: paymentMethods[0]?.id || "phonepe",
    billingAddress: "same",
    checkoutMode: context.authUser ? "login" : "guest"
  });
  const subtotal = context.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const selectedShipping = shippingOptions.find((option) => option.id === form.shippingMethod) || shippingOptions[0];
  const shipping = Number(selectedShipping?.price || 0);
  const total = subtotal + shipping;
  const hasRequiredAddress = ["contact", "firstName", "lastName", "address1", "city", "state", "pinCode", "phone"].every((key) => String(form[key] || "").trim());

  useEffect(() => {
    document.body.classList.add("checkout-page");
    return () => document.body.classList.remove("checkout-page");
  }, []);

  useEffect(() => {
    if (!context.authUser) return;
    setForm((current) => ({
      ...current,
      contact: current.contact || context.customerProfile.contact || mergedProfile.email || "",
      firstName: current.firstName || context.customerProfile.firstName || savedFirstName,
      lastName: current.lastName || context.customerProfile.lastName || savedLastName,
      address1: current.address1 || context.customerProfile.address || "",
      phone: current.phone || mergedProfile.mobile || "",
      checkoutMode: "login"
    }));
  }, [context.authUser, context.customerProfile, mergedProfile.email, mergedProfile.mobile, savedFirstName, savedLastName]);

  useEffect(() => {
    if (!shippingOptions.some((option) => option.id === form.shippingMethod)) {
      setForm((current) => ({ ...current, shippingMethod: shippingOptions[0]?.id || "standard" }));
    }
  }, [form.shippingMethod, shippingOptions]);

  useEffect(() => {
    if (!paymentMethods.some((method) => method.id === form.paymentMethod)) {
      setForm((current) => ({ ...current, paymentMethod: paymentMethods[0]?.id || "phonepe" }));
    }
  }, [form.paymentMethod, paymentMethods]);

  const submitOrder = (event) => {
    event.preventDefault();
    if (!context.cart.length || !hasRequiredAddress) return;
    const createdAt = new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const newOrders = context.cart.map((item) => ({
      slug: item.slug,
      name: item.name,
      image: item.image,
      category: item.category,
      quantity: Number(item.quantity || 1),
      total: Number(item.price || 0) * Number(item.quantity || 1),
      date: createdAt,
      status: "Order Confirmed"
    }));
    context.setOrders([...newOrders, ...context.orders].slice(0, 24));
    context.setCustomerProfile({
      ...context.customerProfile,
      firstName: form.firstName,
      lastName: form.lastName,
      contact: form.contact,
      phone: form.phone,
      address: `${form.address1}, ${form.city}, ${form.state} - ${form.pinCode}`
    });
    context.setCart([]);
    context.notify("Order placed successfully");
    navigate("/");
  };

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <div className="container checkout-header-inner">
          <Link className="checkout-brand" to="/" aria-label={`${general.storeName || "Avyona"} home`}>
            <img src={general.logoUrl || getOptimizedAssetPath("/images/avyona logo.png")} alt={`${general.storeName || "Avyona"} logo`} />
          </Link>
          <div className="checkout-header-meta">
            <span>Secure Checkout</span>
            <span>{shippingSettings.deliveryTime || "Fast Delivery Available"}</span>
            <span>{paymentSettings.codEnabled ? "COD Available" : "Prepaid Orders Only"}</span>
          </div>
        </div>
      </header>
      <main className="container checkout-main">
        <form className="checkout-layout" onSubmit={submitOrder}>
          <section className="checkout-form-panel">
            <div className="checkout-section">
              <div className="section-topline"><h2>Contact</h2><Link to="/account" className="checkout-inline-link">Login for faster checkout</Link></div>
              <div className="checkout-choice-row">
                <label className="choice-pill">
                  <input type="radio" name="checkoutMode" checked={form.checkoutMode === "guest"} onChange={() => setForm({ ...form, checkoutMode: "guest" })} />
                  <span>Continue as Guest</span>
                </label>
                <label className="choice-pill">
                  <input type="radio" name="checkoutMode" checked={form.checkoutMode === "login"} onChange={() => setForm({ ...form, checkoutMode: "login" })} />
                  <span>Login</span>
                </label>
              </div>
              {form.checkoutMode === "login" && !context.authUser ? <p className="checkout-login-note">Login is not active yet for this session. Continue as guest or <Link to="/account">open account</Link>.</p> : null}
              {context.authUser ? <p className="checkout-login-note">Signed in as {context.authUser.email || context.authUser.mobile}. Saved details are ready to use.</p> : null}
              <div className="field-group"><label className="field-label">Email or Mobile Number</label><input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} required /></div>
            </div>
            <div className="checkout-section">
              <h2>Delivery</h2>
              <div className="field-group"><label className="field-label">Country/Region</label><select value="India" disabled><option>India</option></select></div>
              <div className="field-grid two-col">
                <div className="field-group"><label className="field-label">First Name</label><input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} required /></div>
                <div className="field-group"><label className="field-label">Last Name</label><input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required /></div>
              </div>
              <div className="field-group"><label className="field-label">Company</label><input value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} placeholder="Company (optional)" /></div>
              <div className="field-group"><label className="field-label">Address</label><input value={form.address1} onChange={(event) => setForm({ ...form, address1: event.target.value })} required /></div>
              <div className="field-group"><label className="field-label">Apartment, Suite, etc.</label><input value={form.address2} onChange={(event) => setForm({ ...form, address2: event.target.value })} placeholder="Apartment, suite, etc. (optional)" /></div>
              <div className="field-grid location-grid">
                <div className="field-group"><label className="field-label">City</label><input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required /></div>
                <div className="field-group"><label className="field-label">State</label><input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required /></div>
                <div className="field-group"><label className="field-label">PIN Code</label><input value={form.pinCode} onChange={(event) => setForm({ ...form, pinCode: event.target.value })} required /></div>
              </div>
              <div className="field-group"><label className="field-label">Phone</label><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required /></div>
              {hasRequiredAddress ? (
                <p className="delivery-estimate">
                  {`Estimated delivery in ${shippingSettings.deliveryTime || "3 to 5 business days"} - `}
                  {paymentSettings.codEnabled ? "COD available for eligible PINs" : "Prepaid payment required"}
                </p>
              ) : null}
            </div>
            <div className="checkout-section">
              <h2>Shipping Method</h2>
              <div className="option-stack">
                {shippingOptions.map((option) => (
                  <label key={option.id} className={`shipping-option ${form.shippingMethod === option.id ? "active" : ""}`}>
                    <input type="radio" name="shippingMethod" checked={form.shippingMethod === option.id} onChange={() => setForm({ ...form, shippingMethod: option.id })} />
                    <span className="option-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="option-price">{option.price === 0 ? "Free" : formatCurrency(option.price, context)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="checkout-section">
              <h2>Payment</h2>
              <p className="section-note">All transactions are secure and encrypted.</p>
              <div className="option-stack payment-stack">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="payment-option">
                    <input type="radio" name="paymentMethod" checked={form.paymentMethod === method.id} onChange={() => setForm({ ...form, paymentMethod: method.id })} />
                    <div className="payment-option-body">
                      <div className="payment-option-head">
                        <strong>{method.label}</strong>
                        {method.id === "cod" ? (
                          <span className="payment-support-copy">Available on eligible PIN codes</span>
                        ) : (
                          <div className="checkout-payment-icons">
                            {paymentIcons.map((icon, index) => <img key={`${method.id}-${icon}`} src={icon} alt={`Payment icon ${index + 1}`} loading="lazy" />)}
                          </div>
                        )}
                      </div>
                      <p>{method.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="trust-mini-grid"><span>SSL Secure</span><span>100% Safe Payment</span><span>Fast Delivery Available</span></div>
            </div>
            <div className="checkout-section">
              <h2>Billing Address</h2>
              <div className="option-stack">
                <label className="billing-option">
                  <input type="radio" name="billingAddress" checked={form.billingAddress === "same"} onChange={() => setForm({ ...form, billingAddress: "same" })} />
                  <span>Same as shipping address</span>
                </label>
                <label className="billing-option">
                  <input type="radio" name="billingAddress" checked={form.billingAddress === "different"} onChange={() => setForm({ ...form, billingAddress: "different" })} />
                  <span>Use a different billing address</span>
                </label>
              </div>
            </div>
            <div className="checkout-cta-wrap"><button className="checkout-pay-button" type="submit" disabled={!context.cart.length}>{context.cart.length ? "Pay Now" : "Cart Empty"}</button><p className="checkout-cta-note">Secure Checkout. You will not be charged until you confirm.</p></div>
          </section>
          <aside className="checkout-summary-panel">
            <details className="mobile-summary-toggle" open>
              <summary><span>Order Summary</span><strong>{formatCurrency(total, context)}</strong></summary>
              <div className="mobile-summary-body">
                <div className="summary-shell">
                  <div className="summary-items">
                    {context.cart.length ? context.cart.map((item) => <article key={`${item.slug}:${item.variantLabel || ""}`} className="summary-item"><div className="summary-item-art"><img src={item.image} alt={item.name} /></div><div className="summary-item-copy"><h3>{item.name}</h3><p className="summary-meta">{`Quantity: ${item.quantity}`}</p></div><strong className="summary-item-price">{formatCurrency(Number(item.price || 0) * Number(item.quantity || 1), context)}</strong></article>) : <div className="checkout-empty-state"><h3>Your cart is empty</h3><p>Add products before continuing to checkout.</p><Link to="/">Continue Shopping</Link></div>}
                  </div>
                  <div className="summary-totals">
                    <div className="summary-row"><span>Subtotal</span><strong>{formatCurrency(subtotal, context)}</strong></div>
                    <div className="summary-row"><span>Shipping</span><strong>{shipping === 0 ? "Free" : formatCurrency(shipping, context)}</strong></div>
                    <div className="summary-row total-row"><span>Total</span><strong>{formatCurrency(total, context)}</strong></div>
                  </div>
                </div>
              </div>
            </details>
          </aside>
        </form>
      </main>
    </div>
  );
}
