import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { blogEntriesBySlug } from "../data/storefront-content";

export default function BlogPage() {
  const { slug } = useParams();
  const article = blogEntriesBySlug[slug];

  if (!article) return <Navigate to="/" replace />;

  return (
    <main className="container blog-page-main">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Blog</span>
        <span>/</span>
        <span>{article.title}</span>
      </div>

      <article className="blog-article-shell">
        <div className="blog-article-hero">
          <div className="blog-article-copy">
            <p className="eyebrow">{article.category}</p>
            <h1>{article.title}</h1>
            <p className="blog-article-intro">{article.intro}</p>
            <div className="blog-article-meta">
              <span>{article.readTime}</span>
              <Link to="/">Back to Home</Link>
            </div>
          </div>
          <div className="blog-article-image">
            <img src={article.image} alt={article.title} />
          </div>
        </div>

        <div className="blog-article-content">
          {article.sections.map((section) => (
            <section key={section.heading} className="blog-article-section">
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
