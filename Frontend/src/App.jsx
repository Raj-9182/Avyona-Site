import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  AccountPage,
  BlogPage,
  CheckoutPage,
  ContactPage,
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
import { trackAnalyticsEvent } from "./api/analyticsApi";
import { fetchCategoryTree } from "./api/categoryApi";
import { fetchStorefrontCoupons } from "./api/couponApi";
import { fallbackCategoryTree } from "./data/category-data";
import { fetchPublicSettings } from "./api/settingsApi";
import { fetchStorefrontProducts } from "./api/productApi";
import { clearCustomerToken, fetchCurrentCustomer, fetchCustomerCart, fetchCustomerOrders, fetchCustomerWishlist, getCustomerToken, syncCustomerCart, syncCustomerWishlist } from "./api/customerApi";
import { allProducts } from "./data/storefront-content";
import { couponRules } from "../../shared/coupons";
import { DEFAULT_APP_SETTINGS, getPublicSettings, mergeSettings } from "../../shared/appSettings";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { usePersistentState } from "./hooks/usePersistentState";

const CART_STORAGE_KEY = "avyonaCart";
const WISHLIST_STORAGE_KEY = "avyonaWishlist";
const AUTH_STORAGE_KEY = "avyonaAuthUser";
const ACCOUNT_STORAGE_KEY = "avyonaAccounts";
const CUSTOMER_PROFILE_KEY = "avyonaCustomerProfile";
const ORDER_STORAGE_KEY = "avyonaOrders";
const PUBLIC_DATA_REFRESH_MS = 5 * 60 * 1000;

function normalizeBackendProduct(product) {
  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || price || 0);
  const stockQuantity = Number(product.stockQuantity || 0);
  const discount = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const collectionSlug = product.categorySlug || String(product.categoryName || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const gallery = Array.isArray(product.galleryUrls) && product.galleryUrls.length
    ? product.galleryUrls.filter(Boolean)
    : [];
  const primaryImage = gallery[0] || product.imageUrl || "";

  return {
    id: product.id,
    asin: product.asin,
    sku: product.asin,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.categoryName || "Products",
    collectionSlug,
    price,
    mrp,
    discount,
    image: primaryImage,
    gallery,
    highlights: [product.shortDescription || "New Avyona product"].filter(Boolean),
    description: product.description ? String(product.description).split(/\n+/).filter(Boolean) : [product.shortDescription || "Product details will be updated soon."],
    rating: Number(product.rating || 0),
    reviewCount: Number(product.reviewCount || 0),
    availableStock: stockQuantity,
    stockTone: stockQuantity > 0 ? "in-stock" : "out-of-stock",
    stockNote: stockQuantity > 0 ? "Available for dispatch" : "Out of stock",
    variantGroupId: product.variantGroupId || "",
    variantGroupName: product.variantGroupName || "",
    variantType: product.variantType || "",
    variantValue: product.variantValue || product.name,
    variants: [],
    specGroups: [],
    reviews: [],
    faqs: [],
    warrantySummary: "",
    returnSummary: ""
  };
}

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
  const [storefrontProducts, setStorefrontProducts] = useState(allProducts);
  const [storefrontCoupons, setStorefrontCoupons] = useState(couponRules);
  const [isProductCatalogLoading, setIsProductCatalogLoading] = useState(true);
  const [isCategoryCatalogLoading, setIsCategoryCatalogLoading] = useState(true);
  const [hasLoadedCustomerSession, setHasLoadedCustomerSession] = useState(false);
  const [hasHydratedCustomerData, setHasHydratedCustomerData] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomerSession() {
      if (!getCustomerToken()) {
        setHasLoadedCustomerSession(true);
        setHasHydratedCustomerData(true);
        return;
      }

      try {
        const response = await fetchCurrentCustomer();
        if (!isMounted) return;
        const customer = response.data?.customer;
        if (customer) {
          setAuthUser({ id: customer.id, fullName: customer.fullName, email: customer.email, mobile: customer.mobile });
          setCustomerProfile({
            firstName: customer.firstName,
            lastName: customer.lastName,
            contact: customer.email,
            phone: customer.mobile
          });
        }
      } catch {
        clearCustomerToken();
        if (isMounted) setAuthUser(null);
      } finally {
        if (isMounted) setHasLoadedCustomerSession(true);
      }
    }

    loadCustomerSession();

    return () => {
      isMounted = false;
    };
  }, [setAuthUser, setCustomerProfile]);

  useEffect(() => {
    if (!hasLoadedCustomerSession || !authUser || hasHydratedCustomerData) return undefined;
    let isMounted = true;

    async function hydrateCustomerData() {
      try {
        const [cartResult, wishlistResult, ordersResult] = await Promise.allSettled([
          fetchCustomerCart(),
          fetchCustomerWishlist(),
          fetchCustomerOrders()
        ]);

        if (!isMounted) return;

        if (cartResult.status === "fulfilled") {
          const dbCart = Array.isArray(cartResult.value.data) ? cartResult.value.data : [];
          if (dbCart.length) setCart(dbCart);
          else if (cart.length) await syncCustomerCart(cart).catch(() => {});
        }

        if (wishlistResult.status === "fulfilled") {
          const dbWishlist = Array.isArray(wishlistResult.value.data) ? wishlistResult.value.data : [];
          if (dbWishlist.length) setWishlist(dbWishlist);
          else if (wishlist.length) await syncCustomerWishlist(wishlist).catch(() => {});
        }

        if (ordersResult.status === "fulfilled") {
          const dbOrders = Array.isArray(ordersResult.value.data) ? ordersResult.value.data : [];
          if (dbOrders.length) setOrders(dbOrders);
        }
      } finally {
        if (isMounted) setHasHydratedCustomerData(true);
      }
    }

    hydrateCustomerData();

    return () => {
      isMounted = false;
    };
  }, [authUser, cart, hasHydratedCustomerData, hasLoadedCustomerSession, setCart, setOrders, setWishlist, wishlist]);

  useEffect(() => {
    if (!authUser || !hasHydratedCustomerData) return undefined;
    const timerId = window.setTimeout(() => {
      syncCustomerCart(cart).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [authUser, cart, hasHydratedCustomerData]);

  useEffect(() => {
    if (!authUser || !hasHydratedCustomerData) return undefined;
    const timerId = window.setTimeout(() => {
      syncCustomerWishlist(wishlist).catch(() => {});
    }, 300);
    return () => window.clearTimeout(timerId);
  }, [authUser, hasHydratedCustomerData, wishlist]);

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

    async function loadProducts() {
      setIsProductCatalogLoading(true);
      try {
        const response = await fetchStorefrontProducts({ status: "active", limit: 36 });
        if (!isMounted) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        const backendProducts = rows.map(normalizeBackendProduct);
        const staticBySlug = new Map(allProducts.map((product) => [product.slug, product]));
        backendProducts.forEach((product) => staticBySlug.set(product.slug, product));
        setStorefrontProducts([...staticBySlug.values()]);
      } catch {
        if (isMounted) setStorefrontProducts(allProducts);
      } finally {
        if (isMounted) setIsProductCatalogLoading(false);
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCoupons() {
      try {
        const response = await fetchStorefrontCoupons({ status: "active" });
        if (!isMounted) return;
        const rows = Array.isArray(response.data) ? response.data : [];
        setStorefrontCoupons(rows.length ? rows : couponRules);
      } catch {
        if (isMounted) setStorefrontCoupons(couponRules);
      }
    }

    loadCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isRefreshing = false;

    async function refreshPublicData() {
      if (isRefreshing) return;
      isRefreshing = true;

      const [settingsResult, productsResult, categoriesResult, couponsResult] = await Promise.allSettled([
        fetchPublicSettings(),
        fetchStorefrontProducts({ status: "active", limit: 36 }),
        fetchCategoryTree(),
        fetchStorefrontCoupons({ status: "active" })
      ]);

      if (!isMounted) return;

      if (settingsResult.status === "fulfilled") {
        setSiteSettings(getPublicSettings(mergeSettings(DEFAULT_APP_SETTINGS, settingsResult.value.data || {})));
      }

      if (productsResult.status === "fulfilled") {
        const rows = Array.isArray(productsResult.value.data) ? productsResult.value.data : [];
        const backendProducts = rows.map(normalizeBackendProduct);
        const mergedBySlug = new Map(allProducts.map((product) => [product.slug, product]));
        backendProducts.forEach((product) => mergedBySlug.set(product.slug, product));
        setStorefrontProducts([...mergedBySlug.values()]);
      }

      if (categoriesResult.status === "fulfilled") {
        const rows = categoriesResult.value.data;
        if (Array.isArray(rows) && rows.length) setSiteCategories(rows);
      }

      if (couponsResult.status === "fulfilled") {
        const rows = Array.isArray(couponsResult.value.data) ? couponsResult.value.data : [];
        setStorefrontCoupons(rows.length ? rows : couponRules);
      }

      isRefreshing = false;
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        refreshPublicData();
      }
    }

    const intervalId = window.setInterval(refreshPublicData, PUBLIC_DATA_REFRESH_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      setIsCategoryCatalogLoading(true);
      try {
        const response = await fetchCategoryTree();
        if (!isMounted) return;
        setSiteCategories(Array.isArray(response.data) && response.data.length ? response.data : fallbackCategoryTree);
      } catch {
        if (isMounted) {
          setSiteCategories(fallbackCategoryTree);
        }
      } finally {
        if (isMounted) {
          setIsCategoryCatalogLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const notify = (message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = typeof message === "object"
      ? { id, ...message }
      : { id, message, ...options };
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, toast.duration || 2200);
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
          asin: product.asin,
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
    const animationImage = safeVariant?.image || product.image || "";
    if (cartButton && animationImage) {
      const triggerRect = triggerElement?.getBoundingClientRect?.();
      const cartRect = cartButton.getBoundingClientRect();
      const startSize = triggerRect ? Math.max(82, Math.min(132, triggerRect.height + 54)) : 108;
      const endSize = 12;

      setCartAnimation({
        key: `${product.slug}-${Date.now()}`,
        image: animationImage,
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
    trackAnalyticsEvent({
      eventType: "add_to_cart",
      productAsin: product.asin,
      productSlug: product.slug,
      quantity,
      cartValue: Number((safeVariant?.price ?? product.price) || 0) * Number(quantity || 1),
      metadata: {
        productName: product.name,
        variantLabel: safeVariant?.label || ""
      }
    });
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
    const removedItem = cart.find(
      (item) => item.slug === slug && String(item.variantLabel || "") === String(variantLabel || "")
    );
    setCart((current) =>
      current.filter(
        (item) => !(item.slug === slug && String(item.variantLabel || "") === String(variantLabel || ""))
      )
    );
    if (removedItem) {
      trackAnalyticsEvent({
        eventType: "remove_from_cart",
        productAsin: removedItem.asin,
        productSlug: removedItem.slug,
        quantity: removedItem.quantity,
        cartValue: Number(removedItem.price || 0) * Number(removedItem.quantity || 1),
        metadata: {
          productName: removedItem.name,
          variantLabel: removedItem.variantLabel || ""
        }
      });
    }
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
        asin: product.asin,
        slug: product.slug,
        name: product.name,
        category: product.category,
        price: variant?.price ?? product.price,
        image: variant?.image || product.image,
        variantLabel
      }
    ]);
    notify("Saved to wishlist");
    trackAnalyticsEvent({
      eventType: "wishlist_add",
      productAsin: product.asin,
      productSlug: product.slug,
      cartValue: Number((variant?.price ?? product.price) || 0),
      metadata: {
        productName: product.name,
        variantLabel
      }
    });
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
    setAuthUser: (nextUser) => {
      setHasHydratedCustomerData(false);
      if (!nextUser) {
        clearCustomerToken();
      }
      setAuthUser(nextUser);
    },
    setAccounts,
    setCustomerProfile,
    setOrders,
    siteSettings,
    siteCategories,
    coupons: storefrontCoupons,
    isProductCatalogLoading,
    isCategoryCatalogLoading,
    allProducts: storefrontProducts
  };

  return (
    <div className="app-shell">
      <SeoManager />
      <Routes>
        <Route
          path="/"
          element={
            <StoreLayout context={context} allProducts={storefrontProducts}>
              <Home context={context} />
            </StoreLayout>
          }
        />
        <Route path="/blog/:slug" element={<StoreLayout context={context} allProducts={storefrontProducts}><BlogPage /></StoreLayout>} />
        <Route path="/collections" element={<StoreLayout context={context} allProducts={storefrontProducts}><CollectionsPage context={context} /></StoreLayout>} />
        <Route path="/category/:slug" element={<StoreLayout context={context} allProducts={storefrontProducts}><CollectionPage context={context} /></StoreLayout>} />
        <Route path="/collection/:slug" element={<StoreLayout context={context} allProducts={storefrontProducts}><CollectionPage context={context} /></StoreLayout>} />
        <Route path="/search" element={<StoreLayout context={context} allProducts={storefrontProducts}><SearchPage context={context} /></StoreLayout>} />
        <Route path="/offers" element={<StoreLayout context={context} allProducts={storefrontProducts}><OffersPage context={context} /></StoreLayout>} />
        <Route path="/contact" element={<StoreLayout context={context} allProducts={storefrontProducts}><ContactPage context={context} /></StoreLayout>} />
        <Route path="/wishlist" element={<StoreLayout context={context} allProducts={storefrontProducts}><WishlistPage context={context} /></StoreLayout>} />
        <Route path="/track-order" element={<StoreLayout context={context} allProducts={storefrontProducts}><TrackOrderPage context={context} /></StoreLayout>} />
        <Route path="/product/:slug/:variantKey" element={<StoreLayout context={context} allProducts={storefrontProducts}><ProductPage context={context} /></StoreLayout>} />
        <Route path="/product/:slug" element={<StoreLayout context={context} allProducts={storefrontProducts}><ProductPage context={context} /></StoreLayout>} />
        <Route path="/account" element={<AccountPage context={context} />} />
        <Route path="/profile" element={<ProtectedRoute allow={Boolean(authUser)}><ProfilePage context={context} /></ProtectedRoute>} />
        <Route path="/checkout" element={<CheckoutPage context={context} />} />
        <Route path="/order-confirmation/:orderNumber" element={<StoreLayout context={context} allProducts={storefrontProducts}><OrderConfirmationPage context={context} /></StoreLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-chip ${toast.variant ? `toast-chip-${toast.variant}` : ""}`}>
            {toast.variant === "success" ? <span className="toast-icon" aria-hidden="true">✓</span> : null}
            <div>
              {toast.title ? <strong>{toast.title}</strong> : null}
              <span>{toast.message}</span>
            </div>
          </div>
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
