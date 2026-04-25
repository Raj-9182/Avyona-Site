import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  AccountPage,
  BlogPage,
  CheckoutPage,
  OrderConfirmationPage,
  CollectionPage,
  CollectionsPage,
  Home,
  OffersPage,
  ProductPage,
  ProfilePage,
  SearchPage,
  TrackOrderPage,
  WishlistPage
} from "./pages";
import SeoManager from "./components/layout/SeoManager";
import StoreLayout from "./components/layout/StoreLayout";
import { fetchCategoryTree } from "./api/categoryApi";
import { fallbackCategoryTree } from "./data/category-data";
import { fetchPublicSettings } from "./api/settingsApi";
import { allProducts } from "./data/storefront-content";
import { DEFAULT_APP_SETTINGS, getPublicSettings, mergeSettings } from "../../shared/appSettings";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { usePersistentState } from "./hooks/usePersistentState";

const CART_STORAGE_KEY = "avyonaCart";
const WISHLIST_STORAGE_KEY = "avyonaWishlist";
const AUTH_STORAGE_KEY = "avyonaAuthUser";
const ACCOUNT_STORAGE_KEY = "avyonaAccounts";
const CUSTOMER_PROFILE_KEY = "avyonaCustomerProfile";
const ORDER_STORAGE_KEY = "avyonaOrders";

function App() {
  const location = useLocation();
  const [cart, setCart] = usePersistentState(CART_STORAGE_KEY, []);
  const [wishlist, setWishlist] = usePersistentState(WISHLIST_STORAGE_KEY, []);
  const [authUser, setAuthUser] = usePersistentState(AUTH_STORAGE_KEY, null, { removeWhenNull: true });
  const [accounts, setAccounts] = usePersistentState(ACCOUNT_STORAGE_KEY, []);
  const [customerProfile, setCustomerProfile] = usePersistentState(CUSTOMER_PROFILE_KEY, {});
  const [orders, setOrders] = usePersistentState(ORDER_STORAGE_KEY, []);
  const [toasts, setToasts] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartAnimation, setCartAnimation] = useState(null);
  const [siteSettings, setSiteSettings] = useState(() => getPublicSettings(DEFAULT_APP_SETTINGS));
  const [siteCategories, setSiteCategories] = useState(fallbackCategoryTree);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!cartAnimation) return undefined;

    const activateTimer = window.setTimeout(() => {
      setCartAnimation((current) => (current ? { ...current, active: true } : current));
    }, 20);
    const cleanupTimer = window.setTimeout(() => {
      setCartAnimation(null);
    }, 1500);

    return () => {
      window.clearTimeout(activateTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [cartAnimation]);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicSettings() {
      try {
        const response = await fetchPublicSettings();

        if (!isMounted) return;

        setSiteSettings(getPublicSettings(mergeSettings(DEFAULT_APP_SETTINGS, response.data || {})));
      } catch {
        if (isMounted) {
          setSiteSettings(getPublicSettings(DEFAULT_APP_SETTINGS));
        }
      }
    }

    loadPublicSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      try {
        const response = await fetchCategoryTree();
        if (!isMounted) return;
        setSiteCategories(Array.isArray(response.data) && response.data.length ? response.data : fallbackCategoryTree);
      } catch {
        if (isMounted) {
          setSiteCategories(fallbackCategoryTree);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const notify = (message) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 2200);
  };

  const addToCart = (product, variant, quantity = 1, triggerElement = null) => {
    const safeVariant = variant || product.variants?.[0];
    const availableStock = Number(safeVariant?.availableStock ?? 99);
    if (availableStock <= 0) {
      notify("This product is currently out of stock.");
      return;
    }
    setCart((current) => {
      const index = current.findIndex(
        (item) => item.slug === product.slug && String(item.variantLabel || "") === String(safeVariant?.label || "")
      );
      if (index >= 0) {
        const next = [...current];
        next[index] = {
          ...next[index],
          quantity: Math.min(Number(next[index].quantity || 0) + quantity, availableStock)
        };
        return next;
      }
      return [
        ...current,
        {
          slug: product.slug,
          name: product.name,
          category: product.category,
          price: safeVariant?.price ?? product.price,
          quantity: Math.min(quantity, availableStock),
          image: safeVariant?.image || product.image,
          variantLabel: safeVariant?.label || ""
        }
      ];
    });

    const cartButton = typeof document !== "undefined"
      ? document.querySelector("[data-cart-target='true']")
      : null;
    if (cartButton) {
      const triggerRect = triggerElement?.getBoundingClientRect?.();
      const cartRect = cartButton.getBoundingClientRect();
      const startSize = triggerRect ? Math.max(82, Math.min(132, triggerRect.height + 54)) : 108;
      const endSize = 12;

      setCartAnimation({
        key: `${product.slug}-${Date.now()}`,
        image: safeVariant?.image || product.image,
        active: false,
        startX: triggerRect ? (triggerRect.left + (triggerRect.width / 2) - (startSize / 2)) : ((window.innerWidth / 2) - (startSize / 2)),
        startY: triggerRect ? (triggerRect.top + (triggerRect.height / 2) - (startSize / 2)) : ((window.innerHeight / 2) - (startSize / 2)),
        endX: cartRect.left + (cartRect.width / 2) - (endSize / 2),
        endY: cartRect.top + (cartRect.height / 2) - (endSize / 2),
        startSize,
        endSize
      });
    }

    notify("Added to cart");
  };

  const updateCartQuantity = (slug, variantLabel, quantity) => {
    setCart((current) =>
      current
        .map((item) =>
          item.slug === slug && String(item.variantLabel || "") === String(variantLabel || "")
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (slug, variantLabel) => {
    setCart((current) =>
      current.filter(
        (item) => !(item.slug === slug && String(item.variantLabel || "") === String(variantLabel || ""))
      )
    );
  };

  const toggleWishlist = (product, variant) => {
    const variantLabel = variant?.label || "";
    const exists = wishlist.some(
      (item) => item.slug === product.slug && String(item.variantLabel || "") === String(variantLabel)
    );
    if (exists) {
      setWishlist((current) =>
        current.filter(
          (item) => !(item.slug === product.slug && String(item.variantLabel || "") === String(variantLabel))
        )
      );
      notify("Removed from wishlist");
      return;
    }
    setWishlist((current) => [
      ...current,
      {
        slug: product.slug,
        name: product.name,
        category: product.category,
        price: variant?.price ?? product.price,
        image: variant?.image || product.image,
        variantLabel
      }
    ]);
    notify("Saved to wishlist");
  };

  const context = {
    cart,
    wishlist,
    authUser,
    accounts,
    customerProfile,
    orders,
    notify,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateCartQuantity,
    removeCartItem,
    toggleWishlist,
    setCart,
    setWishlist,
    setAuthUser,
    setAccounts,
    setCustomerProfile,
    setOrders,
    siteSettings,
    siteCategories
  };

  return (
    <div className="app-shell">
      <SeoManager />
      <Routes>
        <Route
          path="/"
          element={
            <StoreLayout context={context} allProducts={allProducts}>
              <Home context={context} />
            </StoreLayout>
          }
        />
        <Route path="/blog/:slug" element={<StoreLayout context={context} allProducts={allProducts}><BlogPage /></StoreLayout>} />
        <Route path="/collections" element={<StoreLayout context={context} allProducts={allProducts}><CollectionsPage context={context} /></StoreLayout>} />
        <Route path="/category/:slug" element={<StoreLayout context={context} allProducts={allProducts}><CollectionPage context={context} /></StoreLayout>} />
        <Route path="/collection/:slug" element={<StoreLayout context={context} allProducts={allProducts}><CollectionPage context={context} /></StoreLayout>} />
        <Route path="/search" element={<StoreLayout context={context} allProducts={allProducts}><SearchPage context={context} /></StoreLayout>} />
        <Route path="/offers" element={<StoreLayout context={context} allProducts={allProducts}><OffersPage context={context} /></StoreLayout>} />
        <Route path="/wishlist" element={<StoreLayout context={context} allProducts={allProducts}><WishlistPage context={context} /></StoreLayout>} />
        <Route path="/track-order" element={<StoreLayout context={context} allProducts={allProducts}><TrackOrderPage context={context} /></StoreLayout>} />
        <Route path="/product/:slug/:variantKey" element={<StoreLayout context={context} allProducts={allProducts}><ProductPage context={context} /></StoreLayout>} />
        <Route path="/product/:slug" element={<StoreLayout context={context} allProducts={allProducts}><ProductPage context={context} /></StoreLayout>} />
        <Route path="/account" element={<AccountPage context={context} />} />
        <Route path="/profile" element={<ProtectedRoute allow={Boolean(authUser)}><ProfilePage context={context} /></ProtectedRoute>} />
        <Route path="/checkout" element={<CheckoutPage context={context} />} />
        <Route path="/order-confirmation/:orderNumber" element={<StoreLayout context={context} allProducts={allProducts}><OrderConfirmationPage context={context} /></StoreLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-chip">{toast.message}</div>
        ))}
      </div>
      {cartAnimation ? (
        <div
          key={cartAnimation.key}
          className={`cart-fly-image ${cartAnimation.active ? "is-active" : ""}`}
          aria-hidden="true"
          style={{
            left: `${cartAnimation.active ? cartAnimation.endX : cartAnimation.startX}px`,
            top: `${cartAnimation.active ? cartAnimation.endY : cartAnimation.startY}px`,
            width: `${cartAnimation.active ? cartAnimation.endSize : cartAnimation.startSize}px`,
            height: `${cartAnimation.active ? cartAnimation.endSize : cartAnimation.startSize}px`,
            transform: `rotate(${cartAnimation.active ? 6 : 0}deg) scale(${cartAnimation.active ? 0.18 : 1})`,
            opacity: cartAnimation.active ? 0 : 1
          }}
        >
          <img src={cartAnimation.image} alt="" />
        </div>
      ) : null}
    </div>
  );
}

export default App;
