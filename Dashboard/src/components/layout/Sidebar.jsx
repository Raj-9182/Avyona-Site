import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaCog,
  FaHome,
  FaImages,
  FaEnvelope,
  FaPercent,
  FaList,
  FaShoppingCart,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTags,
  FaUsers
} from "react-icons/fa";
import { clearAdminToken } from "../../api/adminApi";
import { canViewModule } from "../../utils/accessControl";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: FaTachometerAlt, module: "dashboard" },
  { label: "Homepage", to: "/dashboard/homepage", icon: FaHome, module: "homepage" },
  { label: "Products", to: "/dashboard/products", icon: FaBox, module: "products" },
  { label: "Variations", to: "/dashboard/variations", icon: FaTags, module: "variations" },
  { label: "Coupons", to: "/dashboard/coupons", icon: FaPercent, module: "coupons" },
  { label: "Categories", to: "/dashboard/categories", icon: FaList, module: "categories" },
  { label: "Website Images", to: "/dashboard/website-images", icon: FaImages, module: "homepage" },
  { label: "Orders", to: "/dashboard/orders", icon: FaShoppingCart, module: "orders" },
  { label: "Customers", to: "/dashboard/customers", icon: FaUsers, module: "customers" },
  { label: "Contact Enquiries", to: "/dashboard/contact-enquiries", icon: FaEnvelope, module: "contact_enquiries" },
  { label: "Settings", to: "/dashboard/settings", icon: FaCog, module: "settings" }
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand-block">
        <p className="dashboard-eyebrow">Admin Panel</p>
        <h2>Avyona Admin</h2>
        <p>Backend control panel for products, orders, customers, and website management.</p>
      </div>

      <nav className="dashboard-nav" aria-label="Admin navigation">
        {navItems.filter((item) => canViewModule(item.module)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/dashboard"}
            className={({ isActive }) => `dashboard-nav-link${isActive ? " is-active" : ""}`}
          >
            <item.icon className="dashboard-nav-icon" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}

        <button className="dashboard-nav-link dashboard-nav-button" type="button" onClick={handleLogout}>
          <FaSignOutAlt className="dashboard-nav-icon" aria-hidden="true" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
