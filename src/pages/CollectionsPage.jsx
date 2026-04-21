import React from "react";
import { Link } from "react-router-dom";
import { categoryRouteMap, collectionData } from "../data/storefront-content";

export default function CollectionsPage() {
  return (
    <main className="container">
      <section className="section-block">
        <div className="section-heading section-heading-centered">
          <div>
            <p className="eyebrow category-heading-tag">Collections</p>
            <h1 className="section-title-large">Explore All Collections</h1>
            <p className="collections-intro">Browse every Avyona category from audio and cameras to smart frames and reading lights.</p>
          </div>
        </div>
        <div className="category-grid">
          {Object.entries(collectionData).map(([slug, collection]) => (
            <Link key={slug} className="category-card category-card-link" to={categoryRouteMap[slug]}>
              <div className="category-art"><img src={collection.bannerImage} alt={collection.title} /></div>
              <div className="category-copy">
                <h3>{collection.title}</h3>
                <p>{collection.description}</p>
              </div>
              <div className="category-meta">
                <span className="category-meta-label">{collection.eyebrow}</span>
                <span className="category-action-chip">Explore Now</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
