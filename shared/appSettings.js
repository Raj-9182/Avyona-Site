export const DEFAULT_APP_SETTINGS = {
  general: {
    storeName: "Avyona",
    logoUrl: "/images/optimized/avyona-logo.webp",
    faviconUrl: "/favicon.ico",
    brandTagline: "Style that moves with you",
    supportEmail: "support@avyona.com",
    supportPhone: "+91 98765 43210",
    businessAddress: "Bengaluru, Karnataka, India",
    gstNumber: "29ABCDE1234F1Z5"
  },
  store: {
    defaultCurrency: "INR",
    currencyFormat: "INR 1,999.00",
    taxInclusion: "inclusive",
    defaultLanguage: "English",
    timezone: "Asia/Kolkata",
    guestCheckoutEnabled: true,
    accountCreationEnabled: true
  },
  payment: {
    codEnabled: true,
    razorpayEnabled: true,
    stripeEnabled: false,
    upiWalletEnabled: true,
    paymentSuccessRule: "Mark order as confirmed after gateway success",
    paymentFailureHandling: "Retry allowed and order kept pending",
    refundSettings: "Manual review before refund approval"
  },
  shipping: {
    shippingCharges: "INR 79 standard shipping",
    freeShippingThreshold: "INR 999",
    deliveryZones: "India-wide with metro priority zones",
    deliveryTime: "3 to 5 business days",
    dispatchTime: "24 to 48 hours",
    pincodeServiceability: "Enabled for supported pin codes"
  },
  tracking: {
    orderStatusFlow: "Pending to Delivered with return states",
    trackingPageEnabled: true,
    defaultStatusMessages: "Shown on public tracking timeline",
    expectedDeliveryLogic: "Calculated from dispatch and shipping settings",
    autoStatusUpdates: false,
    orderIdIsTrackingId: true,
    orderIdPrefix: "AVY",
    orderIdFormatLogic: "Prefix plus numeric sequence, for example AVY12345"
  },
  notifications: {
    orderPlacedEmailEnabled: true,
    orderShippedEmailEnabled: true,
    orderDeliveredEmailEnabled: true,
    whatsappNotificationsEnabled: false,
    smsNotificationsEnabled: false,
    newOrderAlertEnabled: true,
    lowStockAlertEnabled: true
  },
  security: {
    superAdminEnabled: true,
    staffRoleEnabled: true,
    productsAccess: "Configurable by role",
    ordersAccess: "Configurable by role",
    settingsAccess: "Restricted to Super Admin",
    passwordRules: "Strong password policy required",
    sessionTimeout: "30 minutes of inactivity"
  },
  homepage: {
    heroBanners: [
      {
        id: "hero-1",
        mediaType: "image",
        desktopImage: "/images/optimized/banner-1.webp",
        mobileImage: "/images/optimized/banner-1.webp",
        desktopVideo: "",
        mobileVideo: "",
        altText: "Avyona featured electronics collection",
        title: "Shop Avyona Favorites",
        subtitle: "Discover audio, cameras, frames, and smart essentials selected for everyday use.",
        textEnabled: true,
        titleFontSize: 56,
        subtitleFontSize: 17,
        fontFamily: "Montserrat",
        fontStyle: "normal",
        fontWeight: "800",
        ctaEnabled: true,
        buttonText: "View All Collections",
        buttonLink: "/collections",
        status: "active",
        sortOrder: 1
      },
      {
        id: "hero-2",
        mediaType: "image",
        desktopImage: "/images/optimized/banner-2.webp",
        mobileImage: "/images/optimized/banner-2.webp",
        desktopVideo: "",
        mobileVideo: "",
        altText: "Avyona setup upgrade banner",
        title: "Upgrade Your Setup",
        subtitle: "Explore trusted electronics for work, travel, gifting, and home.",
        textEnabled: true,
        titleFontSize: 56,
        subtitleFontSize: 17,
        fontFamily: "Montserrat",
        fontStyle: "normal",
        fontWeight: "800",
        ctaEnabled: true,
        buttonText: "Shop Now",
        buttonLink: "/collections",
        status: "active",
        sortOrder: 2
      },
      {
        id: "hero-3",
        mediaType: "image",
        desktopImage: "/images/optimized/banner-3.webp",
        mobileImage: "/images/optimized/banner-3.webp",
        desktopVideo: "",
        mobileVideo: "",
        altText: "Fresh Avyona product picks",
        title: "Fresh Picks Are Here",
        subtitle: "Find new arrivals and popular products in one easy storefront.",
        textEnabled: true,
        titleFontSize: 56,
        subtitleFontSize: 17,
        fontFamily: "Montserrat",
        fontStyle: "normal",
        fontWeight: "800",
        ctaEnabled: true,
        buttonText: "Explore Products",
        buttonLink: "/collections",
        status: "active",
        sortOrder: 3
      }
    ],
    globalHeroCta: {
      enabled: false,
      buttonText: "Shop Now",
      buttonLink: "/collections"
    },
    ourProducts: [],
    bestSellerCategories: [
      "personal-audio",
      "professional-audio",
      "digital-camera",
      "security-camera",
      "digital-photo-frames",
      "reading-light"
    ],
    bestSellerProducts: [],
    newArrivalProducts: [],
    featuredBrands: []
  }
};

export const SETTINGS_SECTIONS = [
  {
    id: "general",
    label: "General Settings",
    description: "Control the core brand identity that flows from admin settings into the website, checkout, emails, and invoices.",
    impact: {
      eyebrow: "Branding Impact",
      title: "Admin branding settings should stay consistent everywhere customers see your brand.",
      description: "These values connect dashboard settings to the storefront identity, checkout trust signals, transactional communication, and invoice documents.",
      items: ["Website header and footer", "Checkout page", "Customer emails", "Invoices"]
    },
    groups: [
      {
        title: "Brand Assets",
        fields: [
          { key: "general.storeName", label: "Store Name", type: "text" },
          { key: "general.logoUrl", label: "Logo URL", type: "text" },
          { key: "general.faviconUrl", label: "Favicon URL", type: "text" },
          { key: "general.brandTagline", label: "Brand Tagline", type: "text" }
        ]
      },
      {
        title: "Support & Business Details",
        fields: [
          { key: "general.supportEmail", label: "Support Email", type: "email" },
          { key: "general.supportPhone", label: "Support Phone", type: "text" },
          { key: "general.businessAddress", label: "Business Address", type: "textarea" },
          { key: "general.gstNumber", label: "GST Number", type: "text" }
        ]
      }
    ]
  },
  {
    id: "store",
    label: "Store Settings",
    description: "Manage the core ecommerce behavior that controls pricing display, checkout rules, and order flow.",
    impact: {
      eyebrow: "Commerce Impact",
      title: "Store settings shape how prices appear and how customers move through checkout.",
      description: "These controls define currency presentation, tax visibility, regional defaults, and whether customers can place orders as guests or create accounts during checkout.",
      items: ["Pricing display", "Checkout behavior", "Order flow"]
    },
    groups: [
      {
        title: "Regional Commerce Defaults",
        fields: [
          { key: "store.defaultCurrency", label: "Default Currency", type: "text" },
          { key: "store.currencyFormat", label: "Currency Format", type: "text" },
          {
            key: "store.taxInclusion",
            label: "Tax Inclusion",
            type: "select",
            options: [
              { label: "Inclusive pricing", value: "inclusive" },
              { label: "Exclusive pricing", value: "exclusive" }
            ]
          },
          { key: "store.defaultLanguage", label: "Default Language", type: "text" },
          { key: "store.timezone", label: "Timezone", type: "text" }
        ]
      },
      {
        title: "Checkout & Account Rules",
        fields: [
          { key: "store.guestCheckoutEnabled", label: "Guest Checkout", type: "boolean" },
          { key: "store.accountCreationEnabled", label: "Account Creation", type: "boolean" }
        ]
      }
    ]
  },
  {
    id: "payment",
    label: "Payment Settings",
    description: "Control revenue-critical payment methods, payment outcomes, and refund behavior across checkout and backend order processing.",
    impact: {
      eyebrow: "Revenue Impact",
      title: "Payment settings connect admin controls to checkout options, backend transaction handling, and order status logic.",
      description: "This module determines which payment methods appear to customers, how successful and failed payments are treated, and how refunds should move through the system.",
      items: ["Checkout page", "Payment options shown to users", "Order status updates"]
    },
    groups: [
      {
        title: "Payment Methods",
        fields: [
          { key: "payment.codEnabled", label: "Cash on Delivery", type: "boolean" },
          { key: "payment.razorpayEnabled", label: "Razorpay", type: "boolean" },
          { key: "payment.stripeEnabled", label: "Stripe", type: "boolean" },
          { key: "payment.upiWalletEnabled", label: "UPI / Wallet", type: "boolean" }
        ]
      },
      {
        title: "Transaction Rules",
        fields: [
          { key: "payment.paymentSuccessRule", label: "Payment Success Rule", type: "textarea" },
          { key: "payment.paymentFailureHandling", label: "Payment Failure Handling", type: "textarea" },
          { key: "payment.refundSettings", label: "Refund Settings", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "shipping",
    label: "Shipping & Delivery",
    description: "Control logistics rules, delivery promises, and serviceability details that shape checkout and tracking expectations.",
    impact: {
      eyebrow: "Delivery Impact",
      title: "Shipping settings define what customers see before purchase and what the business promises after checkout.",
      description: "This module controls delivery charges, free shipping logic, zone coverage, dispatch speed, and expected delivery timing used across the storefront and tracking flow.",
      items: ["Product page delivery info", "Checkout delivery calculation", "Track order expected delivery"]
    },
    groups: [
      {
        title: "Shipping Rules",
        fields: [
          { key: "shipping.shippingCharges", label: "Shipping Charges", type: "text" },
          { key: "shipping.freeShippingThreshold", label: "Free Shipping Threshold", type: "text" },
          { key: "shipping.deliveryZones", label: "Delivery Zones", type: "textarea" },
          { key: "shipping.deliveryTime", label: "Delivery Time", type: "text" }
        ]
      },
      {
        title: "Fulfillment Operations",
        fields: [
          { key: "shipping.dispatchTime", label: "Dispatch Time", type: "text" },
          { key: "shipping.pincodeServiceability", label: "Pincode Serviceability", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "tracking",
    label: "Order & Tracking Settings",
    description: "Control the tracking engine used by admin and the public track order page, including status flow, delivery logic, and order ID rules.",
    impact: {
      eyebrow: "Tracking Impact",
      title: "This module is the control center for how orders are identified, updated, and tracked by customers.",
      description: "Since order ID and tracking ID are the same in this system, these settings affect admin order management, the public tracking page, delivery expectations, and overall customer confidence.",
      items: ["Admin dashboard", "Track order page", "Customer experience"]
    },
    groups: [
      {
        title: "Tracking Flow",
        fields: [
          { key: "tracking.orderStatusFlow", label: "Order Status Flow", type: "textarea" },
          { key: "tracking.trackingPageEnabled", label: "Tracking Page", type: "boolean" },
          { key: "tracking.defaultStatusMessages", label: "Default Status Messages", type: "textarea" },
          { key: "tracking.autoStatusUpdates", label: "Auto Status Updates", type: "boolean" }
        ]
      },
      {
        title: "Delivery & Tracking ID Logic",
        fields: [
          { key: "tracking.expectedDeliveryLogic", label: "Expected Delivery Logic", type: "textarea" },
          { key: "tracking.orderIdIsTrackingId", label: "Order ID = Tracking ID", type: "boolean" },
          { key: "tracking.orderIdPrefix", label: "Order ID Prefix", type: "text" },
          { key: "tracking.orderIdFormatLogic", label: "Order ID Format Logic", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "notifications",
    label: "Notification Settings",
    description: "Control customer communication and admin alerting across email, WhatsApp, SMS, and dashboard updates.",
    impact: {
      eyebrow: "Communication Impact",
      title: "Notification settings determine how reliably customers hear from the brand during their order journey.",
      description: "This module controls key order emails, future WhatsApp and SMS support, and the admin alerts needed to respond quickly to sales and inventory events.",
      items: ["Customer trust", "Order communication", "Retention"]
    },
    groups: [
      {
        title: "Customer Notifications",
        fields: [
          { key: "notifications.orderPlacedEmailEnabled", label: "Order Placed Email", type: "boolean" },
          { key: "notifications.orderShippedEmailEnabled", label: "Order Shipped Email", type: "boolean" },
          { key: "notifications.orderDeliveredEmailEnabled", label: "Order Delivered Email", type: "boolean" },
          { key: "notifications.whatsappNotificationsEnabled", label: "WhatsApp Notifications", type: "boolean" },
          { key: "notifications.smsNotificationsEnabled", label: "SMS Notifications", type: "boolean" }
        ]
      },
      {
        title: "Admin Alerts",
        fields: [
          { key: "notifications.newOrderAlertEnabled", label: "New Order Alert", type: "boolean" },
          { key: "notifications.lowStockAlertEnabled", label: "Low Stock Alert", type: "boolean" }
        ]
      }
    ]
  },
  {
    id: "security",
    label: "Security & Admin Control",
    description: "Manage dashboard access, role permissions, password protection, and session security across the admin system.",
    impact: {
      eyebrow: "Security Impact",
      title: "Security settings control who can operate the dashboard and how sensitive actions are protected.",
      description: "This module defines admin role boundaries, feature access levels, password protection, and session limits that safeguard the entire business system.",
      items: ["Security of entire system"]
    },
    groups: [
      {
        title: "Admin Roles",
        fields: [
          { key: "security.superAdminEnabled", label: "Super Admin", type: "boolean" },
          { key: "security.staffRoleEnabled", label: "Staff", type: "boolean" }
        ]
      },
      {
        title: "Permissions & Protection",
        fields: [
          { key: "security.productsAccess", label: "Products Access", type: "text" },
          { key: "security.ordersAccess", label: "Orders Access", type: "text" },
          { key: "security.settingsAccess", label: "Settings Access", type: "text" },
          { key: "security.passwordRules", label: "Password Rules", type: "textarea" },
          { key: "security.sessionTimeout", label: "Session Timeout", type: "text" }
        ]
      }
    ]
  }
];

export function cloneSettings(settings = DEFAULT_APP_SETTINGS) {
  return JSON.parse(JSON.stringify(settings));
}

export function mergeSettings(baseSettings = DEFAULT_APP_SETTINGS, overrides = {}) {
  const base = cloneSettings(baseSettings);

  function mergeInto(target, source) {
    Object.entries(source || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        target[key] = [...value];
        return;
      }

      if (value && typeof value === "object") {
        const current = target[key] && typeof target[key] === "object" ? target[key] : {};
        target[key] = mergeInto({ ...current }, value);
        return;
      }

      target[key] = value;
    });

    return target;
  }

  return mergeInto(base, overrides);
}

export function getSettingValue(settings, path) {
  return path.split(".").reduce((current, key) => (current ? current[key] : undefined), settings);
}

export function setSettingValue(settings, path, value) {
  const next = cloneSettings(settings);
  const keys = path.split(".");
  let current = next;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    current[key] = current[key] && typeof current[key] === "object" ? { ...current[key] } : {};
    current = current[key];
  });

  return next;
}

export function getPublicSettings(settings = DEFAULT_APP_SETTINGS) {
  return {
    general: {
      storeName: settings.general.storeName,
      logoUrl: settings.general.logoUrl,
      faviconUrl: settings.general.faviconUrl,
      brandTagline: settings.general.brandTagline,
      supportEmail: settings.general.supportEmail,
      supportPhone: settings.general.supportPhone,
      businessAddress: settings.general.businessAddress
    },
    store: {
      defaultCurrency: settings.store.defaultCurrency,
      currencyFormat: settings.store.currencyFormat,
      taxInclusion: settings.store.taxInclusion,
      defaultLanguage: settings.store.defaultLanguage,
      timezone: settings.store.timezone,
      guestCheckoutEnabled: settings.store.guestCheckoutEnabled,
      accountCreationEnabled: settings.store.accountCreationEnabled
    },
    payment: {
      codEnabled: settings.payment.codEnabled,
      razorpayEnabled: settings.payment.razorpayEnabled,
      stripeEnabled: settings.payment.stripeEnabled,
      upiWalletEnabled: settings.payment.upiWalletEnabled
    },
    shipping: {
      shippingCharges: settings.shipping.shippingCharges,
      freeShippingThreshold: settings.shipping.freeShippingThreshold,
      deliveryZones: settings.shipping.deliveryZones,
      deliveryTime: settings.shipping.deliveryTime,
      dispatchTime: settings.shipping.dispatchTime,
      pincodeServiceability: settings.shipping.pincodeServiceability
    },
    tracking: {
      trackingPageEnabled: settings.tracking.trackingPageEnabled,
      defaultStatusMessages: settings.tracking.defaultStatusMessages,
      expectedDeliveryLogic: settings.tracking.expectedDeliveryLogic,
      orderIdIsTrackingId: settings.tracking.orderIdIsTrackingId,
      orderIdPrefix: settings.tracking.orderIdPrefix,
      orderIdFormatLogic: settings.tracking.orderIdFormatLogic
    },
    notifications: {
      orderPlacedEmailEnabled: settings.notifications.orderPlacedEmailEnabled,
      orderShippedEmailEnabled: settings.notifications.orderShippedEmailEnabled,
      orderDeliveredEmailEnabled: settings.notifications.orderDeliveredEmailEnabled,
      whatsappNotificationsEnabled: settings.notifications.whatsappNotificationsEnabled,
      smsNotificationsEnabled: settings.notifications.smsNotificationsEnabled
    },
    homepage: {
      heroBanners: Array.isArray(settings.homepage?.heroBanners)
        ? settings.homepage.heroBanners
        : DEFAULT_APP_SETTINGS.homepage.heroBanners,
      globalHeroCta: settings.homepage?.globalHeroCta || DEFAULT_APP_SETTINGS.homepage.globalHeroCta,
      ourProducts: Array.isArray(settings.homepage?.ourProducts)
        ? settings.homepage.ourProducts
        : DEFAULT_APP_SETTINGS.homepage.ourProducts,
      bestSellerProducts: Array.isArray(settings.homepage?.bestSellerProducts)
        ? settings.homepage.bestSellerProducts
        : DEFAULT_APP_SETTINGS.homepage.bestSellerProducts,
      bestSellerCategories: Array.isArray(settings.homepage?.bestSellerCategories)
        ? settings.homepage.bestSellerCategories
        : DEFAULT_APP_SETTINGS.homepage.bestSellerCategories,
      newArrivalProducts: Array.isArray(settings.homepage?.newArrivalProducts)
        ? settings.homepage.newArrivalProducts
        : DEFAULT_APP_SETTINGS.homepage.newArrivalProducts,
      featuredBrands: Array.isArray(settings.homepage?.featuredBrands)
        ? settings.homepage.featuredBrands
        : DEFAULT_APP_SETTINGS.homepage.featuredBrands
    }
  };
}
