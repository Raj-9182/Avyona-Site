import React from "react";
import { Outlet, matchPath, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import "../../index.css";

const pageMeta = [
  {
    path: "/dashboard/products/new",
    title: "Add Product",
    subtitle: "Create a new product for the Avyona ecommerce website."
  },
  {
    path: "/dashboard/products",
    title: "Products",
    subtitle: "Manage your catalog, pricing, inventory, and product visibility."
  },
  {
    path: "/dashboard/variations",
    title: "Variations",
    subtitle: "Manage product variants such as color, size, finish, price, and stock combinations."
  },
  {
    path: "/dashboard/categories",
    title: "Categories",
    subtitle: "Manage category structure used across the storefront and backend."
  },
  {
    path: "/dashboard/orders",
    title: "Orders",
    subtitle: "Track purchases, update order status, and manage fulfillment flow."
  },
  {
    path: "/dashboard/customers",
    title: "Customers",
    subtitle: "View customer records, order history, and business insights."
  },
  {
    path: "/dashboard/settings",
    title: "Settings",
    subtitle: "Manage backend access, uploads, and store-level configuration."
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Monitor revenue, orders, customers, and product activity from the admin backend."
  }
];

function getPageMeta(pathname) {
  return pageMeta.find((item) => matchPath({ path: item.path, end: true }, pathname)) || pageMeta[pageMeta.length - 1];
}

export default function AdminLayout() {
  const location = useLocation();
  const currentPage = getPageMeta(location.pathname);

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <Header title={currentPage.title} subtitle={currentPage.subtitle} />
        <main className="dashboard-overview">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
