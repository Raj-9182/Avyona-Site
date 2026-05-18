import React, { useState } from "react";
import { submitContactEnquiry } from "../api/contactApi";
import {
  FaBriefcase,
  FaBoxOpen,
  FaClock,
  FaEnvelope,
  FaHeadset,
  FaHeart,
  FaLeaf,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegUser,
  FaShieldAlt,
  FaBolt
} from "react-icons/fa";

const enquiryTypes = [
  {
    key: "b2c",
    title: "Customer Support",
    label: "B2C",
    description: "Order help, returns, warranty, delivery support."
  },
  {
    key: "b2b",
    title: "Business Enquiry",
    label: "B2B",
    description: "Bulk orders, dealership, partnerships, corporate enquiries."
  }
];

export default function ContactPage({ context }) {
  const siteSettings = context?.siteSettings || {};
  const general = siteSettings.general || {};
  const supportPhone = general.supportPhone || "";
  const supportEmail = general.supportEmail || "support@avyona.com";
  const storeAddress = general.businessAddress || "Avyona, Surat, Gujarat, India";
  const workingHours = general.workingHours || "Mon - Sat: 10 AM - 7 PM";
  const [enquiryType, setEnquiryType] = useState("b2c");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedType = enquiryTypes.find((type) => type.key === enquiryType) || enquiryTypes[0];

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitted(false);
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(form);

    try {
      await submitContactEnquiry({
        enquiryType: selectedType.label,
        name: String(formData.get("fullName") || "").trim(),
        companyName: String(formData.get("companyName") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        orderId: String(formData.get("orderId") || "").trim(),
        message: String(formData.get("message") || "").trim()
      });
      form.reset();
      setSubmitted(true);
      context?.notify?.("Contact request submitted");
    } catch (submissionError) {
      setError(submissionError.message || "Unable to submit contact enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`container contact-page ${enquiryType === "b2b" ? "is-business" : "is-customer"}`}>
      <section className="contact-hero">
        <div className="contact-hero-visual contact-hero-visual-left" aria-hidden="true">
          <FaLeaf />
        </div>
        <div className="contact-hero-copy">
          <h1>Contact Us</h1>
          <p>Need help with an order or business enquiry?</p>
          <p>We're here to help.</p>
        </div>
        <div className="contact-hero-visual contact-hero-visual-right" aria-hidden="true">
          <FaHeadset />
        </div>
      </section>

      <section className="contact-section-heading">
        <h2>How can we help you?</h2>
        <span aria-hidden="true" />
      </section>

      <section className="contact-type-grid" aria-label="Choose enquiry type">
        {enquiryTypes.map((type) => (
          <button
            key={type.key}
            className={`contact-type-card ${enquiryType === type.key ? "is-active" : ""}`}
            type="button"
            onClick={() => {
              setEnquiryType(type.key);
              setSubmitted(false);
              setError("");
            }}
          >
            <span className="contact-type-icon" aria-hidden="true">
              {type.key === "b2b" ? <FaBriefcase /> : <FaHeadset />}
            </span>
            <span className="contact-type-copy">
              <strong>{type.title}</strong>
              <p>{type.description}</p>
              <span className="contact-card-cta">Continue</span>
            </span>
          </button>
        ))}
      </section>

      <section className="contact-form-panel">
        <div className="contact-form-head">
          <h2>{selectedType.title}</h2>
          <span aria-hidden="true" />
          <p>Fill in the details below and our team will get back to you.</p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-grid">
            <label className="contact-field">
              <span className="sr-only">Name</span>
              <FaRegUser aria-hidden="true" />
              <input name="fullName" autoComplete="name" placeholder="Full Name *" required />
            </label>
            {enquiryType === "b2b" ? (
              <label className="contact-field">
                <span className="sr-only">Company Name</span>
                <FaBriefcase aria-hidden="true" />
                <input name="companyName" autoComplete="organization" placeholder="Company Name *" required />
              </label>
            ) : null}
            <label className="contact-field">
              <span className="sr-only">Email</span>
              <FaEnvelope aria-hidden="true" />
              <input name="email" type="email" autoComplete="email" placeholder="Email Address *" required />
            </label>
            <label className="contact-field">
              <span className="sr-only">Phone</span>
              <FaPhoneAlt aria-hidden="true" />
              <input name="phone" type="tel" autoComplete="tel" placeholder="Phone Number *" required />
            </label>
            {enquiryType === "b2c" ? (
              <label className="contact-field">
                <span className="sr-only">Order ID optional</span>
                <FaBoxOpen aria-hidden="true" />
                <input name="orderId" placeholder="Order ID (Optional)" />
              </label>
            ) : null}
          </div>

          <label className="contact-field contact-message-field">
            <span className="sr-only">Message</span>
            <textarea name="message" rows={5} placeholder="Message *" required />
          </label>

          <button className="primary-button contact-submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Enquiry"}
          </button>
          {error ? <p className="contact-error">{error}</p> : null}
          {submitted ? <p className="contact-success">Thank you. Our team will contact you shortly.</p> : null}
        </form>
      </section>

      <section className="contact-details-bar" aria-label="Contact details">
        <article>
          <span className="contact-detail-icon"><FaEnvelope aria-hidden="true" /></span>
          <strong>Email Us</strong>
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </article>
        <article>
          <span className="contact-detail-icon"><FaPhoneAlt aria-hidden="true" /></span>
          <strong>Call Us</strong>
          {supportPhone ? <a href={`tel:${supportPhone.replace(/\s+/g, "")}`}>{supportPhone}</a> : <span>Phone support coming soon</span>}
        </article>
        <article>
          <span className="contact-detail-icon"><FaClock aria-hidden="true" /></span>
          <strong>Working Hours</strong>
          <span>{workingHours}</span>
        </article>
        <article>
          <span className="contact-detail-icon"><FaMapMarkerAlt aria-hidden="true" /></span>
          <strong>Our Address</strong>
          <span>{storeAddress}</span>
        </article>
      </section>

      <section className="contact-trust-strip" aria-label="Service commitments">
        <span><FaBolt aria-hidden="true" /> Fast Response</span>
        <span><FaLock aria-hidden="true" /> Secure & Safe</span>
        <span><FaShieldAlt aria-hidden="true" /> 100% Privacy</span>
        <span><FaHeart aria-hidden="true" /> Customer First</span>
      </section>
    </main>
  );
}
