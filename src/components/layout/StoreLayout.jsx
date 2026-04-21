import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import CartDrawer from "./CartDrawer";
import PageTitle from "./PageTitle";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

export default function StoreLayout({ children, context, allProducts }) {
  const location = useLocation();

  return (
    <>
      <SiteHeader context={context} allProducts={allProducts} />
      {children}
      <SiteFooter context={context} />
      <CartDrawer context={context} />
      {context.isCartOpen ? <div className="overlay" onClick={() => context.setIsCartOpen(false)} /> : null}
      <PageTitle pathname={location.pathname} />
    </>
  );
}
