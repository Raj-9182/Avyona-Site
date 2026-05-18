import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="container not-found-page">
      <section className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <p>The page you are looking for could not be found.</p>
        <Link className="primary-button" to="/">Go Home</Link>
      </section>
    </main>
  );
}
