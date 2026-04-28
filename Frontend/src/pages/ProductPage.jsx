import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/product/ProductCard";
import { allProducts, categoryRouteMap } from "../data/storefront-content";
import {
  buildProductPath,
  compressImageFile,
  copyText,
  getCheckoutPaymentMethods,
  getProductVariantByKey,
  getSiteSettings,
  formatCurrency,
  getOptimizedAssetPath,
  getReviewStorageKey,
  readStorage,
  writeStorage
} from "../utils/storefront";
import { couponRules, validateCoupon } from "../../../shared/coupons";

const PAYMENT_LOGOS = [
  { src: getOptimizedAssetPath("/images/payment 1.png"), alt: "Payment option 1" },
  { src: getOptimizedAssetPath("/images/payment 2.png"), alt: "Payment option 2" },
  { src: getOptimizedAssetPath("/images/payment 3.png"), alt: "Payment option 3" },
  { src: getOptimizedAssetPath("/images/payment 4.png"), alt: "Payment option 4" }
];

const TRUST_POINTS = [
  "Genuine Product",
  "Secure Checkout",
  "COD Available",
  "Fast Delivery",
  "Support Available"
];

const MOBILE_ZOOM_HOLD_MS = 700;

const POLICY_SECTIONS = [
  {
    key: "shipping",
    title: "Shipping Information"
  },
  {
    key: "returns",
    title: "Return & Refund",
    getBody: () => "Eligible orders can be returned or replaced as per policy terms for the selected category."
  },
  {
    key: "warranty",
    title: "Warranty Support",
    getBody: (product) => product.warrantySummary
      ? `${product.warrantySummary}. Support is available according to the brand and product-type coverage listed in the specifications section.`
      : "Support is available according to the brand and product-type coverage listed in the specifications section."
  },
  {
    key: "cod",
    title: "COD Information"
  }
];

function renderStars(rating) {
  const filled = Math.round(Number(rating || 0));
  return `${"\u2605".repeat(filled)}${"\u2606".repeat(Math.max(0, 5 - filled))}`;
}

function getGalleryItems(product, selectedVariant) {
  const sourceGallery = selectedVariant?.gallery?.length ? selectedVariant.gallery : product.gallery || [product.image];
  const items = sourceGallery.map((entry, index) => ({
    type: entry.endsWith(".mp4") ? "video" : "image",
    src: entry,
    thumb: entry.endsWith(".mp4") ? product.videoPoster || product.image : entry,
    alt: `${product.name} ${index + 1}`
  }));

  if (product.video && !items.some((item) => item.src === product.video)) {
    items.push({
      type: "video",
      src: product.video,
      thumb: product.videoPoster || product.image,
      alt: `${product.name} video`
    });
  }

  return items;
}

function getReviewStats(reviews, fallbackAverage) {
  if (!reviews.length) {
    return {
      average: Number(fallbackAverage || 0),
      breakdown: [5, 4, 3, 2, 1].map((rating) => ({ rating, count: 0, percentage: 0 }))
    };
  }

  const total = reviews.length;
  const average = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total;
  return {
    average,
    breakdown: [5, 4, 3, 2, 1].map((rating) => {
      const count = reviews.filter((review) => Number(review.rating || 0) === rating).length;
      return {
        rating,
        count,
        percentage: Math.round((count / total) * 100)
      };
    })
  };
}

function getCustomerMedia(product, reviews, galleryItems) {
  const reviewMedia = reviews.flatMap((review, index) => {
    const imageItems = (review.images || []).map((image, mediaIndex) => ({
      key: `review-image-${index}-${mediaIndex}`,
      type: "image",
      src: image,
      alt: `${review.name} review image ${mediaIndex + 1}`
    }));
    const videoItems = (review.videos || []).map((video, mediaIndex) => ({
      key: `review-video-${index}-${mediaIndex}`,
      type: "video",
      src: video,
      alt: `${review.name} review video ${mediaIndex + 1}`
    }));
    return [...imageItems, ...videoItems];
  });

  if (reviewMedia.length) return reviewMedia;

  return galleryItems.slice(0, 5).map((item, index) => ({
    key: `fallback-media-${index}`,
    type: item.type,
    src: item.src,
    alt: item.alt
  }));
}

export default function ProductPage({ context }) {
  const { slug: productKey, variantKey } = useParams();
  const navigate = useNavigate();
  const productCatalog = context.allProducts && context.allProducts.length ? context.allProducts : allProducts;
  const product = productCatalog.find((item) => item.slug === productKey || String(item.asin || "") === String(productKey || "")) || null;
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const previewRef = useRef(null);
  const mobileZoomTimerRef = useRef(null);
  const mobileZoomTouchRef = useRef(null);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imageZoomActive, setImageZoomActive] = useState(false);
  const [mobileZoomActive, setMobileZoomActive] = useState(false);
  const [zoomMetrics, setZoomMetrics] = useState({
    previewImageWidth: 0,
    previewImageHeight: 0,
    previewOffsetX: 0,
    previewOffsetY: 0,
    lensWidth: 0,
    lensHeight: 0,
    lensLeft: 0,
    lensTop: 0
  });
  const [pincode, setPincode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewVideoUrl, setReviewVideoUrl] = useState("");
  const [reviewImage, setReviewImage] = useState("");
  const [isSavingReviewImage, setIsSavingReviewImage] = useState(false);
  const [productCouponCode, setProductCouponCode] = useState("");
  const [productCouponMessage, setProductCouponMessage] = useState("");
  const [productCouponApplied, setProductCouponApplied] = useState(false);
  const [storedReviews, setStoredReviews] = useState(() => (product ? readStorage(getReviewStorageKey(product.slug), []) : []));
  const hasGroupedVariants = Boolean(product?.variantGroupId);
  const selectedVariant = hasGroupedVariants
    ? (getProductVariantByKey(product, variantKey) || product?.variants?.[0] || null)
    : getProductVariantByKey(product, variantKey);
  const selectedVariantIndex = product?.variants?.findIndex((variant) => variant.key === selectedVariant?.key) ?? -1;
  const groupedVariantProducts = useMemo(() => {
    if (!product?.variantGroupId) return [];

    const groupProducts = productCatalog.filter((item) => String(item.variantGroupId || "") === String(product.variantGroupId || ""));
    return [...groupProducts].sort((left, right) => {
      if (left.asin === product.asin) return -1;
      if (right.asin === product.asin) return 1;
      return String(left.variantValue || left.name).localeCompare(String(right.variantValue || right.name));
    });
  }, [product, productCatalog]);

  useEffect(() => {
    if (!product) return;
    setGalleryIndex(0);
    setQuantity(1);
    setDescriptionExpanded(false);
    setLightboxOpen(false);
    setImageZoomActive(false);
    setMobileZoomActive(false);
    setZoomMetrics({
      previewImageWidth: 0,
      previewImageHeight: 0,
      previewOffsetX: 0,
      previewOffsetY: 0,
      lensWidth: 0,
      lensHeight: 0,
      lensLeft: 0,
      lensTop: 0
    });
    setPincode("");
    setDeliveryMessage("");
    setReviewFormOpen(false);
    setReviewName("");
    setReviewTitle("");
    setReviewBody("");
    setReviewRating(5);
    setReviewVideoUrl("");
    setReviewImage("");
    setProductCouponCode("");
    setProductCouponMessage("");
    setProductCouponApplied(false);
    setStoredReviews(readStorage(getReviewStorageKey(product.slug), []));
  }, [product, selectedVariant?.key]);

  useEffect(() => () => {
    if (mobileZoomTimerRef.current) {
      window.clearTimeout(mobileZoomTimerRef.current);
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("product-page");
    return () => document.body.classList.remove("product-page");
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowRight") setGalleryIndex((current) => current + 1);
      if (event.key === "ArrowLeft") setGalleryIndex((current) => current - 1);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!mobileZoomActive) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.classList.add("product-zoom-active");
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.classList.remove("product-zoom-active");
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [mobileZoomActive]);

  if (!product) return <Navigate to="/" replace />;

  if (!hasGroupedVariants && Array.isArray(product.variants) && product.variants.length) {
    const fallbackPath = buildProductPath(product, product.variants[0]);
    if (!variantKey || !selectedVariant) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  const siteSettings = getSiteSettings(context);
  const shippingSettings = siteSettings.shipping || {};
  const paymentSettings = siteSettings.payment || {};
  const availablePaymentMethods = getCheckoutPaymentMethods(context);
  const dynamicDeliveryText = `Estimated Delivery: ${shippingSettings.deliveryTime || "3 to 5 business days"}`;
  const dynamicDispatchText = `Dispatch Time: ${shippingSettings.dispatchTime || "24 to 48 hours"}`;
  const dynamicShippingText = shippingSettings.shippingCharges
    ? `Shipping: ${shippingSettings.shippingCharges}`
    : (product.shippingText || "Shipping: Secure packaging with safe handling");
  const dynamicCodText = paymentSettings.codEnabled
    ? "COD: Available for eligible locations"
    : "COD: Currently disabled for this store";

  const galleryItems = getGalleryItems(product, selectedVariant);
  const safeGalleryIndex = ((galleryIndex % galleryItems.length) + galleryItems.length) % galleryItems.length;
  const activeMedia = galleryItems[safeGalleryIndex];
  const availableStock = Number(selectedVariant?.availableStock ?? product.availableStock ?? 0);
  const safeQuantity = Math.max(1, Math.min(quantity, Math.max(1, availableStock || 1)));
  const salePrice = Number(selectedVariant?.price ?? product.price);
  const mrp = Number(selectedVariant?.mrp ?? product.mrp);
  const discount = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
  const isWishlisted = context.wishlist.some(
    (item) => item.slug === product.slug && String(item.variantLabel || "") === String(selectedVariant?.label || "")
  );
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const stockTone = availableStock === 0 ? "out" : isLowStock ? "low" : "in";
  const stockLabel = availableStock === 0 ? "Out of Stock" : isLowStock ? `Only ${availableStock} left in stock` : "In Stock";
  const related = productCatalog
    .filter((item) => item.slug !== product.slug && (item.brand === product.brand || item.collectionSlug === product.collectionSlug))
    .slice(0, 4);
  const combinedReviews = [...storedReviews, ...(product.reviews || [])];
  const reviewStats = getReviewStats(combinedReviews, product.reviewSummary?.average);
  const customerMedia = getCustomerMedia(product, combinedReviews, galleryItems);
  const descriptionPreview = descriptionExpanded ? product.description || [] : (product.description || []).slice(0, 2);

  const addSelectedQuantityToCart = (triggerElement = null) => {
    context.addToCart(product, selectedVariant, safeQuantity, triggerElement);
  };

  const applyProductCoupon = (event) => {
    event.preventDefault();
    const result = validateCoupon(productCouponCode, {
      items: [{ ...product, price: salePrice, quantity: safeQuantity }],
      subtotal: salePrice * safeQuantity,
      coupons: couponRules
    });

    setProductCouponMessage(result.message);
    setProductCouponApplied(result.valid);

    if (result.valid) {
      writeStorage("avyonaPendingCoupon", result.coupon.code);
      setProductCouponCode(result.coupon.code);
      context.notify(`${result.coupon.code} ready for checkout`);
    }
  };

  const handleBuyNow = (triggerElement = null) => {
    addSelectedQuantityToCart(triggerElement);
    navigate("/checkout");
  };

  const handlePincodeCheck = (event) => {
    event.preventDefault();
    const trimmed = pincode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setDeliveryMessage("Enter a valid 6-digit pincode to check delivery.");
      return;
    }
    setDeliveryMessage(`Delivery to ${trimmed} is available in ${shippingSettings.deliveryTime || "3 to 5 business days"}. Dispatch starts within ${shippingSettings.dispatchTime || "24 to 48 hours"}.`);
  };

  const updateZoomMetrics = (pointerEvent = null) => {
    if (!stageRef.current || !imageRef.current || !previewRef.current) return;

    const stageBounds = stageRef.current.getBoundingClientRect();
    const imageBounds = imageRef.current.getBoundingClientRect();
    const previewWidth = Number(previewRef.current.clientWidth || 0);
    const previewHeight = Number(previewRef.current.clientHeight || 0);
    const imageWidth = Number(imageBounds.width || 0);
    const imageHeight = Number(imageBounds.height || 0);

    if (!previewWidth || !previewHeight || !imageWidth || !imageHeight) return;

    const zoomLevel = 2.6;
    const lensWidth = Math.min(imageWidth, previewWidth / zoomLevel);
    const lensHeight = Math.min(imageHeight, previewHeight / zoomLevel);
    const pointerX = pointerEvent ? pointerEvent.clientX : imageBounds.left + (imageWidth / 2);
    const pointerY = pointerEvent ? pointerEvent.clientY : imageBounds.top + (imageHeight / 2);
    const relativeX = Math.max(0, Math.min(imageWidth, pointerX - imageBounds.left));
    const relativeY = Math.max(0, Math.min(imageHeight, pointerY - imageBounds.top));
    const halfLensWidth = lensWidth / 2;
    const halfLensHeight = lensHeight / 2;
    const clampedLensX = Math.max(halfLensWidth, Math.min(imageWidth - halfLensWidth, relativeX));
    const clampedLensY = Math.max(halfLensHeight, Math.min(imageHeight - halfLensHeight, relativeY));
    const previewImageWidth = imageWidth * zoomLevel;
    const previewImageHeight = imageHeight * zoomLevel;
    const previewOffsetX = Math.min(0, Math.max(previewWidth - previewImageWidth, (previewWidth / 2) - (clampedLensX * zoomLevel)));
    const previewOffsetY = Math.min(0, Math.max(previewHeight - previewImageHeight, (previewHeight / 2) - (clampedLensY * zoomLevel)));

    setZoomMetrics({
      previewImageWidth,
      previewImageHeight,
      previewOffsetX,
      previewOffsetY,
      lensWidth,
      lensHeight,
      lensLeft: (imageBounds.left - stageBounds.left) + clampedLensX,
      lensTop: (imageBounds.top - stageBounds.top) + clampedLensY
    });
  };

  const clearMobileZoomTimer = () => {
    if (!mobileZoomTimerRef.current) return;
    window.clearTimeout(mobileZoomTimerRef.current);
    mobileZoomTimerRef.current = null;
  };

  const closeMobileZoom = () => {
    clearMobileZoomTimer();
    mobileZoomTouchRef.current = null;
    setMobileZoomActive(false);
    setImageZoomActive(false);
  };

  const handleStageTouchStart = (event) => {
    if (activeMedia.type !== "image") return;

    clearMobileZoomTimer();

    const firstTouch = event.touches?.[0];
    if (!firstTouch) return;

    mobileZoomTouchRef.current = {
      startX: firstTouch.clientX,
      startY: firstTouch.clientY
    };

    mobileZoomTimerRef.current = window.setTimeout(() => {
      updateZoomMetrics(firstTouch);
      setMobileZoomActive(true);
      setImageZoomActive(true);
      mobileZoomTimerRef.current = null;
    }, MOBILE_ZOOM_HOLD_MS);
  };

  const handleStageTouchMove = (event) => {
    if (activeMedia.type !== "image") return;

    const firstTouch = event.touches?.[0];
    if (!firstTouch) return;

    if (mobileZoomActive) {
      event.preventDefault();
      updateZoomMetrics(firstTouch);
      return;
    }

    if (!mobileZoomTouchRef.current) return;

    const movedX = Math.abs(firstTouch.clientX - mobileZoomTouchRef.current.startX);
    const movedY = Math.abs(firstTouch.clientY - mobileZoomTouchRef.current.startY);

    if (movedX > 14 || movedY > 14) {
      clearMobileZoomTimer();
      mobileZoomTouchRef.current = null;
    }
  };

  const handleReviewImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setReviewImage("");
      return;
    }

    setIsSavingReviewImage(true);
    try {
      const compressed = await compressImageFile(file, 900, 0.82);
      setReviewImage(compressed);
    } catch {
      context.notify("Review image could not be processed");
    } finally {
      setIsSavingReviewImage(false);
    }
  };

  const submitReview = (event) => {
    event.preventDefault();
    if (!reviewName.trim() || !reviewBody.trim() || !reviewTitle.trim()) return;

    const nextReview = {
      name: reviewName.trim(),
      title: reviewTitle.trim(),
      rating: reviewRating,
      date: new Date().toLocaleString("en-IN", { month: "long", year: "numeric" }),
      body: reviewBody.trim(),
      images: reviewImage ? [reviewImage] : [],
      videos: reviewVideoUrl.trim() ? [reviewVideoUrl.trim()] : []
    };

    const nextReviews = [nextReview, ...storedReviews];
    setStoredReviews(nextReviews);
    writeStorage(getReviewStorageKey(product.slug), nextReviews);
    setReviewName("");
    setReviewTitle("");
    setReviewBody("");
    setReviewRating(5);
    setReviewVideoUrl("");
    setReviewImage("");
    setReviewFormOpen(false);
    context.notify("Review submitted");
  };

  return (
    <main className="container product-page-main">
      <div className="product-breadcrumb breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={categoryRouteMap[product.collectionSlug] || "/collections"}>{product.category}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <section className="avy-product-hero">
        <div className="avy-product-gallery-card">
          <div className="avy-gallery-meta">
            <span className="avy-gallery-count">{safeGalleryIndex + 1} / {galleryItems.length}</span>
            <button type="button" className="avy-zoom-button" onClick={() => setLightboxOpen(true)}>View Fullscreen</button>
          </div>
          <div className={`avy-gallery-stage-shell ${mobileZoomActive ? "is-mobile-zoom-shell" : ""}`}>
            <div
              className={`avy-gallery-stage ${product.collectionSlug === "digital-photo-frames" ? "is-frame-product" : ""} ${activeMedia.type === "image" ? "is-image-stage" : ""} ${imageZoomActive ? "is-zoom-active" : ""} ${mobileZoomActive ? "is-mobile-zoom-active" : ""}`}
              ref={stageRef}
              onContextMenu={(event) => {
                if (activeMedia.type === "image") {
                  event.preventDefault();
                }
              }}
              onMouseEnter={() => {
                if (activeMedia.type === "image") {
                  updateZoomMetrics();
                  setImageZoomActive(true);
                }
              }}
              onMouseMove={(event) => {
                if (activeMedia.type !== "image") return;
                updateZoomMetrics(event);
              }}
              onMouseLeave={() => {
                setImageZoomActive(false);
              }}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={closeMobileZoom}
              onTouchCancel={closeMobileZoom}
              role={activeMedia.type === "image" ? "img" : undefined}
              aria-label={activeMedia.type === "image" ? "Product image zoom preview" : undefined}
            >
            {activeMedia.type === "video" ? (
              <video controls poster={product.videoPoster || product.image} src={activeMedia.src} />
            ) : (
              <>
                <img
                  ref={imageRef}
                  className="avy-gallery-main-image"
                  src={activeMedia.src}
                  alt={activeMedia.alt}
                  draggable="false"
                  onContextMenu={(event) => event.preventDefault()}
                  onDragStart={(event) => event.preventDefault()}
                  onLoad={() => updateZoomMetrics()}
                />
                <span
                  className={`avy-gallery-zoom-lens ${imageZoomActive ? "is-visible" : ""}`}
                  aria-hidden="true"
                  style={{
                    left: `${zoomMetrics.lensLeft}px`,
                    top: `${zoomMetrics.lensTop}px`,
                    width: zoomMetrics.lensWidth ? `${zoomMetrics.lensWidth}px` : undefined,
                    height: zoomMetrics.lensHeight ? `${zoomMetrics.lensHeight}px` : undefined
                  }}
                />
                <span className="avy-gallery-zoom-hint">{mobileZoomActive ? "Release to close zoom" : "Hover or press and hold to zoom"}</span>
              </>
            )}
            </div>
            {activeMedia.type === "image" ? (
              <div
                className={`avy-gallery-zoom-panel ${imageZoomActive ? "is-visible" : ""} ${mobileZoomActive ? "is-mobile-visible" : ""}`}
                aria-hidden={!imageZoomActive}
              >
                <div ref={previewRef} className="avy-gallery-zoom-preview">
                  <img
                    className="avy-gallery-zoom-preview-image"
                    src={activeMedia.src}
                    alt=""
                    aria-hidden="true"
                    style={{
                      width: zoomMetrics.previewImageWidth ? `${zoomMetrics.previewImageWidth}px` : undefined,
                      height: zoomMetrics.previewImageHeight ? `${zoomMetrics.previewImageHeight}px` : undefined,
                      transform: `translate(${zoomMetrics.previewOffsetX}px, ${zoomMetrics.previewOffsetY}px)`
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className={`avy-gallery-strip ${mobileZoomActive ? "is-hidden-during-zoom" : ""}`}>
            {galleryItems.map((item, index) => (
              <button
                key={`${item.src}:${index}`}
                type="button"
                className={`avy-gallery-thumb ${safeGalleryIndex === index ? "is-active" : ""}`}
                onClick={() => {
                  setGalleryIndex(index);
                  setImageZoomActive(false);
                }}
              >
                <img src={item.thumb || item.src} alt={item.alt} />
                {item.type === "video" ? <span className="avy-gallery-badge">Video</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="avy-product-summary">
          <div className="avy-summary-card">
            <div className="avy-brand-row">
              <Link className="avy-brand-link" to={categoryRouteMap[product.collectionSlug] || "/collections"}>
                By {product.brand}
              </Link>
              <div className="avy-brand-actions">
                <button type="button" className={`avy-text-action ${isWishlisted ? "is-active" : ""}`} onClick={() => context.toggleWishlist(product, selectedVariant)}>
                  {isWishlisted ? "Wishlisted" : "Wishlist"}
                </button>
                <button type="button" className="avy-text-action" onClick={() => copyText(window.location.href, () => context.notify("Product link copied"))}>
                  Share
                </button>
              </div>
            </div>

            <h1 className="avy-product-title">{product.name}</h1>

            <div className="avy-review-row">
              <span className="avy-review-stars">{renderStars(reviewStats.average)}</span>
              <strong>{reviewStats.average.toFixed(1)}</strong>
              <a href="#customer-reviews">{combinedReviews.length} Ratings</a>
              <a href="#customer-media">Customer Photos & Videos</a>
            </div>

            <div className="avy-price-block">
              <div className="avy-price-line">
                <strong>{formatCurrency(salePrice, context)}</strong>
                <span className="avy-mrp">{formatCurrency(mrp, context)}</span>
                {discount > 0 ? <span className="avy-discount-badge">{discount}% OFF</span> : null}
              </div>
              <p>{product.taxText}</p>
            </div>

            <div className={`avy-stock-chip ${stockTone}`}>
              <span>{stockLabel}</span>
              {availableStock > 0 ? <small>{product.stockNote}</small> : <small>{product.stockNote}</small>}
            </div>

            <section className="avy-product-coupon-box">
              <form className="avy-product-coupon-form" onSubmit={applyProductCoupon}>
                <label>
                  <span>Coupon Code</span>
                  <div className="avy-product-coupon-row">
                    <input
                      value={productCouponCode}
                      onChange={(event) => {
                        setProductCouponCode(event.target.value.toUpperCase());
                        setProductCouponApplied(false);
                        setProductCouponMessage("");
                      }}
                      placeholder="SUMMER15"
                      aria-label="Coupon code"
                    />
                    <button type="submit">Apply</button>
                  </div>
                </label>
                {productCouponMessage ? (
                  <p className={productCouponApplied ? "avy-product-coupon-message success" : "avy-product-coupon-message"}>
                    {productCouponApplied ? `${productCouponMessage} It will be available in checkout.` : productCouponMessage}
                  </p>
                ) : null}
              </form>
            </section>

            {hasGroupedVariants && groupedVariantProducts.length > 1 ? (
              <div className="avy-block">
                <div className="avy-section-minihead">
                  <span>{product.variantType || "Variant"}</span>
                  <strong>{product.variantValue || product.name}</strong>
                </div>
                <div className="avy-variant-list">
                  {groupedVariantProducts.map((groupProduct) => {
                    const groupProductVariant = groupProduct.variants?.[0] || null;
                    const isActive = groupProduct.asin === product.asin;

                    return (
                      <button
                        key={groupProduct.asin}
                        type="button"
                        className={`avy-variant-chip ${isActive ? "is-active" : ""}`}
                        onClick={() => navigate(buildProductPath(groupProduct))}
                      >
                        <span className="avy-variant-media">
                          <img src={groupProduct.image} alt={groupProduct.variantValue || groupProduct.name} />
                        </span>
                        <span className="avy-variant-copy">
                          <span>{groupProduct.variantValue || groupProduct.name}</span>
                          <strong>{formatCurrency(groupProductVariant?.price ?? groupProduct.price, context)}</strong>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (product.variants || []).length ? (
              <div className="avy-block">
                <div className="avy-section-minihead">
                  <span>Choose Variant</span>
                  <strong>{selectedVariant?.label}</strong>
                </div>
                <div className="avy-variant-list">
                  {(product.variants || []).map((variant, index) => (
                    <button
                      key={variant.key}
                      type="button"
                      className={`avy-variant-chip ${selectedVariantIndex === index ? "is-active" : ""}`}
                      onClick={() => {
                        navigate(buildProductPath(product, variant));
                      }}
                    >
                      <span className="avy-variant-media">
                        <img src={variant.image || product.image} alt={variant.label} />
                      </span>
                      <span className="avy-variant-copy">
                        <span>{variant.label}</span>
                        <strong>{formatCurrency(variant.price, context)}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="avy-block">
              <div className="avy-section-minihead">
                <span>Quantity</span>
                {availableStock > 0 ? <strong>{availableStock} available</strong> : <strong>Currently unavailable</strong>}
              </div>
              <div className="avy-quantity-row">
                <div className="avy-quantity-stepper">
                  <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={safeQuantity <= 1}>-</button>
                  <span>{safeQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(Math.max(1, availableStock || 1), current + 1))}
                    disabled={availableStock === 0 || safeQuantity >= availableStock}
                  >
                    +
                  </button>
                </div>
                {isLowStock ? <p className="avy-quantity-note">Limited stock. Order soon for faster dispatch.</p> : null}
              </div>
            </div>

            <div className="avy-block">
              <h2 className="avy-block-title">Product Details</h2>
              <ul className="avy-bullet-list">
                {(product.highlights || []).slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <details className="avy-accordion" open>
              <summary>Delivery Information</summary>
              <div className="avy-accordion-body">
                <div className="avy-delivery-lines">
                  <p>{dynamicDeliveryText}</p>
                  <p>{dynamicDispatchText}</p>
                  <p>{dynamicCodText}</p>
                  <p>{dynamicShippingText}</p>
                  <p>{`SKU: ${product.sku} | ASIN: ${product.asin}`}</p>
                </div>
              </div>
            </details>

            <div className="avy-delivery-check">
              <div className="avy-delivery-check-copy">
                <strong>Check Delivery</strong>
                <span>Enter your pincode for serviceability.</span>
              </div>
              <form className="avy-pincode-form compact" onSubmit={handlePincodeCheck}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(event) => setPincode(event.target.value.replace(/\D+/g, ""))}
                />
                <button type="submit">Check</button>
              </form>
              {deliveryMessage ? <p className="avy-helper-note avy-delivery-message">{deliveryMessage}</p> : null}
            </div>

            <div className="avy-cta-stack">
              <button className="avy-button-primary" type="button" onClick={(event) => handleBuyNow(event.currentTarget)} disabled={availableStock === 0}>Buy Now</button>
              <button className="avy-button-secondary" type="button" onClick={(event) => addSelectedQuantityToCart(event.currentTarget)} disabled={availableStock === 0}>Add to Cart</button>
            </div>

            <div className="avy-quick-assurance">
              <span>{paymentSettings.codEnabled ? "Cash on Delivery Available" : "Prepaid Checkout Enabled"}</span>
              <span>Secure Payments Supported</span>
              <span>Warranty Available</span>
            </div>

            <section className="avy-payment-card">
              <h2>Available Payment Options</h2>
              <div className="avy-payment-grid">
                {availablePaymentMethods.map((method, index) => {
                  const logo = PAYMENT_LOGOS[index % PAYMENT_LOGOS.length];

                  return (
                    <div key={method.id} className="avy-payment-icon" title={method.label}>
                      <img src={logo.src} alt={method.label} />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="avy-trust-strip">
              {TRUST_POINTS.map((item) => <span key={item}>{item}</span>)}
            </div>

            <div className="avy-meta-strip">
              {product.warrantySummary ? <span>{product.warrantySummary}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="avy-product-section">
        <div className="avy-section-heading">
          <h2>Product Description</h2>
        </div>
        <div className="avy-surface-card avy-copy-card">
          {descriptionPreview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {(product.description || []).length > 2 ? (
            <button type="button" className="avy-inline-button" onClick={() => setDescriptionExpanded((current) => !current)}>
              {descriptionExpanded ? "Read Less" : "Read More"}
            </button>
          ) : null}
        </div>
      </section>

      <section className="avy-product-section avy-product-section-narrow">
        <div className="avy-section-heading">
          <h2>Product Specifications</h2>
        </div>
        <div className="avy-spec-stack">
          {(product.specGroups || []).map((group) => (
            <details key={group.title} className="avy-accordion">
              <summary>{group.title}</summary>
              <div className="avy-accordion-body">
                <div className="avy-spec-grid">
                  {group.items.map((item) => (
                    <div key={item[0]} className="avy-spec-row">
                      <span>{item[0]}</span>
                      <strong>{item[1]}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="avy-product-section avy-product-section-narrow">
        <div className="avy-section-heading">
          <h2>Delivery, Return & Warranty</h2>
        </div>
        <div className="avy-spec-stack">
          {POLICY_SECTIONS.map((section) => (
            <details key={section.key} className="avy-accordion">
              <summary>{section.title}</summary>
              <div className="avy-accordion-body">
                <p>
                  {section.key === "shipping"
                    ? `${dynamicDispatchText}. ${dynamicDeliveryText}. ${dynamicShippingText}.`
                    : section.key === "cod"
                      ? `${dynamicCodText}. Availability depends on serviceability and order value for your delivery location.`
                      : section.key === "returns"
                        ? "Eligible orders can be returned or replaced as per policy terms for the selected category."
                        : (product.warrantySummary
                          ? `${product.warrantySummary}. Support is available according to the brand and product-type coverage listed in the specifications section.`
                          : "Support is available according to the brand and product-type coverage listed in the specifications section.")}
                </p>
                {section.key === "returns" ? <p>{product.returnSummary}</p> : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section id="customer-reviews" className="avy-product-section">
        <div className="avy-section-heading">
          <h2>Customer Reviews</h2>
          <button type="button" className="avy-inline-button" onClick={() => setReviewFormOpen((current) => !current)}>
            {reviewFormOpen ? "Close Review Form" : "Write a Review"}
          </button>
        </div>

        <div className="avy-reviews-layout">
          <aside className="avy-surface-card avy-review-summary">
            <strong className="avy-review-average">{reviewStats.average.toFixed(1)}</strong>
            <span className="avy-review-stars large">{renderStars(reviewStats.average)}</span>
            <p>{combinedReviews.length} customer reviews</p>
            <div className="avy-rating-bars">
              {reviewStats.breakdown.map((item) => (
                <div key={item.rating} className="avy-rating-bar-row">
                  <span>{item.rating}★</span>
                  <div className="avy-rating-bar-track">
                    <div className="avy-rating-bar-fill" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <strong>{item.percentage}%</strong>
                </div>
              ))}
            </div>
          </aside>

          <div className="avy-review-content">
            <div id="customer-media" className="avy-surface-card">
              <div className="avy-section-heading compact avy-section-heading-centered">
                <h3>Customer Photos & Videos</h3>
              </div>
              <div className="avy-media-strip">
                {customerMedia.map((item) => (
                  <div key={item.key} className="avy-media-card">
                    {item.type === "video" ? (
                      <video controls poster={product.videoPoster || product.image} src={item.src} />
                    ) : (
                      <img src={item.src} alt={item.alt} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {reviewFormOpen ? (
              <form className="avy-surface-card avy-review-form" onSubmit={submitReview}>
                <div className="avy-review-form-grid">
                  <label>
                    <span>Name</span>
                    <input value={reviewName} onChange={(event) => setReviewName(event.target.value)} required />
                  </label>
                  <label>
                    <span>Review Title</span>
                    <input value={reviewTitle} onChange={(event) => setReviewTitle(event.target.value)} required />
                  </label>
                </div>
                <label>
                  <span>Rating</span>
                  <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </label>
                <label>
                  <span>Your Review</span>
                  <textarea rows="5" value={reviewBody} onChange={(event) => setReviewBody(event.target.value)} required />
                </label>
                <div className="avy-review-form-grid">
                  <label>
                    <span>Add Photo</span>
                    <input type="file" accept="image/*" onChange={handleReviewImageChange} />
                  </label>
                  <label>
                    <span>Video URL</span>
                    <input value={reviewVideoUrl} onChange={(event) => setReviewVideoUrl(event.target.value)} placeholder="Optional video link" />
                  </label>
                </div>
                {isSavingReviewImage ? <p className="avy-helper-note">Processing image...</p> : null}
                {reviewImage ? <img className="avy-review-upload-preview" src={reviewImage} alt="Review upload preview" /> : null}
                <div className="avy-review-form-actions">
                  <button className="avy-button-primary" type="submit">Submit Review</button>
                </div>
              </form>
            ) : null}

            <div className="avy-review-list">
              {combinedReviews.map((review, index) => (
                <article key={`${review.name}:${review.title}:${index}`} className="avy-surface-card avy-review-card">
                  <div className="avy-review-card-head">
                    <div>
                      <div className="avy-review-stars">{renderStars(review.rating)}</div>
                      <h3>{review.title}</h3>
                    </div>
                    <span className="avy-verified-badge">Verified Purchase</span>
                  </div>
                  <p>{review.body}</p>
                  {(review.images?.length || review.videos?.length) ? (
                    <div className="avy-media-strip inline">
                      {(review.images || []).map((image, imageIndex) => (
                        <div key={`${review.title}:image:${imageIndex}`} className="avy-media-card small">
                          <img src={image} alt={`${review.title} ${imageIndex + 1}`} />
                        </div>
                      ))}
                      {(review.videos || []).map((video, videoIndex) => (
                        <div key={`${review.title}:video:${videoIndex}`} className="avy-media-card small">
                          <video controls src={video} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="avy-review-meta">
                    <span>{review.name}</span>
                    <span>{review.date}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="avy-product-section">
        <div className="avy-section-heading">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="avy-spec-stack">
          {(product.faqs || []).map((faq) => (
            <details key={faq.question} className="avy-accordion">
              <summary>{faq.question}</summary>
              <div className="avy-accordion-body">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="avy-product-section">
        <div className="avy-section-heading">
          <h2>You Might Also Like</h2>
        </div>
        <div className="product-grid">
          {related.map((item) => <ProductCard key={item.slug} product={item} context={context} actionLabel="Explore" actionMode="link" />)}
        </div>
      </section>

      <div className="avy-mobile-sticky-bar">
        <div>
          <strong>{formatCurrency(salePrice, context)}</strong>
          <span>{stockLabel}</span>
        </div>
        <button className="avy-button-secondary" type="button" onClick={(event) => addSelectedQuantityToCart(event.currentTarget)} disabled={availableStock === 0}>Add to Cart</button>
        <button className="avy-button-primary" type="button" onClick={(event) => handleBuyNow(event.currentTarget)} disabled={availableStock === 0}>Buy Now</button>
      </div>

      {lightboxOpen ? (
        <div className="avy-lightbox" onClick={() => setLightboxOpen(false)}>
          <button type="button" className="avy-lightbox-close" onClick={() => setLightboxOpen(false)}>Close</button>
          <button
            type="button"
            className="avy-lightbox-nav previous"
            onClick={(event) => {
              event.stopPropagation();
              setGalleryIndex((current) => current - 1);
            }}
          >
            Prev
          </button>
          <div className="avy-lightbox-stage" onClick={(event) => event.stopPropagation()}>
            {activeMedia.type === "video" ? (
              <video controls autoPlay poster={product.videoPoster || product.image} src={activeMedia.src} />
            ) : (
              <img src={activeMedia.src} alt={activeMedia.alt} />
            )}
          </div>
          <button
            type="button"
            className="avy-lightbox-nav next"
            onClick={(event) => {
              event.stopPropagation();
              setGalleryIndex((current) => current + 1);
            }}
          >
            Next
          </button>
        </div>
      ) : null}
    </main>
  );
}
