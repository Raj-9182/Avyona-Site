import React from "react";
import CartDrawer from "./CartDrawer";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function StoreLayout({ children, context, allProducts }) {
  return (
    <>
      <SiteHeader context={context} allProducts={allProducts} />
      {children}
      <SiteFooter context={context} />
      <CartDrawer context={context} />
      {context.isCartOpen ? <div className="overlay" onClick={() => context.setIsCartOpen(false)} /> : null}
    </>
  );
}
