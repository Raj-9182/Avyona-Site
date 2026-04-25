import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { allProducts, offerConfigs } from "../data/storefront-content";
import { copyText } from "../utils/storefront";

export default function OffersPage({ context }) {
  const [searchParams] = useSearchParams();
  const selectedOffer = searchParams.get("offer") || "summer-sale";
  const config = offerConfigs[selectedOffer] || offerConfigs["summer-sale"];
  const products = allProducts.filter(config.matches);

  return (
    <main className="container offers-page">
      <div className="breadcrumb"><Link to="/">Home</Link><span>/</span><span>Offers</span></div>
      <section className="offer-page-hero">
        <div className="offer-page-copy">
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
          <div className="offer-page-actions">
            <button className="offer-copy-button" type="button" onClick={() => copyText(config.coupon, () => context.notify("Coupon copied"))}>Copy {config.coupon}</button>
            <span className="offer-page-code">{config.coupon}</span>
          </div>
        </div>
        <div className="offer-page-visual"><img src={config.image} alt={config.title} /></div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Eligible Products</p><h2>{config.heading}</h2></div></div>
        <div className="product-grid">{products.map((product) => <ProductCard key={product.slug} product={product} context={context} actionLabel="Explore" actionMode="link" />)}</div>
      </section>
    </main>
  );
}
