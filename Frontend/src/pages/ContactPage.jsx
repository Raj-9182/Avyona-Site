import React, { useState } from "react";
import { Link } from "react-router-dom";

const SUPPORT_TOPICS = [
  "Product enquiry",
  "Order support",
  "Shipping and delivery",
  "Returns or warranty",
  "Bulk or business purchase"
];

export default function ContactPage({ context }) {
  const siteSettings = context?.siteSettings || {};
  const general = siteSettings.general || {};
  const storeName = general.storeName || "Avyona";
  const supportPhone = general.supportPhone || "+91 98765 43210";
  const supportEmail = general.supportEmail || "support@avyona.com";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: SUPPORT_TOPICS[0],
    message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (key, value) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitContact = (event) => {
    event.preventDefault();
    setSubmitted(true);
    context?.notify?.("Your message has been received");
    setForm({
      name: "",
      email: "",
      phone: "",
      topic: SUPPORT_TOPICS[0],
      message: ""
    });
  };

  return (
    <main className="container contact-page">
      <nav className="breadcrumb contact-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Contact Us</span>
      </nav>

      <section className="contact-hero">
        <div className="contact-hero-copy">
          <p className="eyebrow">Support</p>
          <h1>Contact Us</h1>
          <p>
            Need help with a product, order, delivery, return, or warranty? Send a message to the {storeName} support team and we will help you with the next step.
          </p>
        </div>
        <div className="contact-quick-card">
          <span>Response Time</span>
          <strong>Within 24 hours</strong>
          <p>Support is available for product guidance, order assistance, and after-sales queries.</p>
        </div>
      </section>

      <section className="contact-layout">
        <aside className="contact-info-panel">
          <article className="contact-info-card">
            <span>Call Support</span>
            <a href={`tel:${supportPhone.replace(/\s+/g, "")}`}>{supportPhone}</a>
            <p>Best for urgent order or delivery support.</p>
          </article>

          <article className="contact-info-card">
            <span>Email Support</span>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            <p>Share order details, product questions, or warranty requests.</p>
          </article>

          <article className="contact-info-card">
            <span>Helpful Links</span>
            <div className="contact-link-list">
              <Link to="/track-order">Track Order</Link>
              <Link to="/collections">Browse Collections</Link>
              <Link to="/offers">View Offers</Link>
            </div>
          </article>
        </aside>

        <section className="contact-form-panel">
          <div className="contact-form-head">
            <p className="eyebrow">Message Us</p>
            <h2>Send a request</h2>
            <p>Fill the form and our team will get back to you using your email or phone number.</p>
          </div>

          <form className="contact-form" onSubmit={submitContact}>
            <div className="contact-form-grid">
              <label>
                <span>Full Name</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>

              <label>
                <span>Email Address</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </label>

              <label>
                <span>Phone Number</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder="+91 98765 43210"
                />
              </label>

              <label>
                <span>Topic</span>
                <select value={form.topic} onChange={(event) => updateField("topic", event.target.value)}>
                  {SUPPORT_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Message</span>
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Tell us how we can help."
                rows={6}
                required
              />
            </label>

            <button className="primary-button contact-submit-button" type="submit">Submit Message</button>
            {submitted ? <p className="contact-success">Thank you. Your message has been received.</p> : null}
          </form>
        </section>
      </section>
    </main>
  );
}
