import React from "react";
import { Route, Routes } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import AddCategory from "../pages/categories/AddCategory";
import Categories from "../pages/categories/Categories";
import CustomerDetails from "../pages/customers/CustomerDetails";
import Customers from "../pages/customers/Customers";
import Coupons from "../pages/coupons/Coupons";
import DashboardHome from "../pages/dashboard/DashboardHome";
import OrderDetails from "../pages/orders/OrderDetails";
import Orders from "../pages/orders/Orders";
import AddProduct from "../pages/products/AddProduct";
import EditProduct from "../pages/products/EditProduct";
import Products from "../pages/products/Products";
import Settings from "../pages/settings/Settings";
import Variations from "../pages/variations/Variations";
import { allProducts as storefrontProducts } from "../data/storefront-content";

const previewContext = {
  cart: [],
  wishlist: [],
  authUser: null,
  accounts: [],
  customerProfile: {},
  orders: [],
  notify: () => {},
  isCartOpen: false,
  setIsCartOpen: () => {},
  addToCart: () => {},
  updateCartQuantity: () => {},
  removeCartItem: () => {},
  toggleWishlist: () => {},
  setCart: () => {},
  setAuthUser: () => {},
  setAccounts: () => {},
  setCustomerProfile: () => {},
  setOrders: () => {}
};

export default function AppRoutes({ context, allProducts }) {
  const resolvedContext = context || previewContext;
  const resolvedProducts = allProducts || storefrontProducts;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<DashboardHome context={resolvedContext} allProducts={resolvedProducts} />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<AddProduct />} />
        <Route path="products/:productId/edit" element={<EditProduct />} />
        <Route path="variations" element={<Variations />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/new" element={<AddCategory />} />
        <Route path="categories/:categoryId/edit" element={<AddCategory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:orderId" element={<OrderDetails />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:customerId" element={<CustomerDetails />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
