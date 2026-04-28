import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBox,
  FaCog,
  FaHome,
  FaImages,
  FaPercent,
  FaList,
  FaShoppingCart,
  FaSignOutAlt,
  FaTachometerAlt,
  FaTags,
  FaUsers
} from "react-icons/fa";
import { clearAdminToken } from "../../api/adminApi";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: FaTachometerAlt },
  { label: "Homepage", to: "/dashboard/homepage", icon: FaHome },
  { label: "Products", to: "/dashboard/products", icon: FaBox },
  { label: "Variations", to: "/dashboard/variations", icon: FaTags },
  { label: "Coupons", to: "/dashboard/coupons", icon: FaPercent },
  { label: "Categories", to: "/dashboard/categories", icon: FaList },
  { label: "Website Images", to: "/dashboard/website-images", icon: FaImages },
  { label: "Orders", to: "/dashboard/orders", icon: FaShoppingCart },
  { label: "Customers", to: "/dashboard/customers", icon: FaUsers },
  { label: "Settings", to: "/dashboard/settings", icon: FaCog }
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate("/dashboard");
  };

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand-block">
        <p className="dashboard-eyebrow">Admin Panel</p>
        <h2>Avyona Admin</h2>
        <p>Backend control panel for products, orders, customers, and website management.</p>
      </div>

      <nav className="dashboard-nav" aria-label="Admin navigation">
        {navItems.map((item) => (
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
