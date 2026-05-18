const paymentOptions = ["MC", "PhonePe", "GPay", "Visa", "UPI", "COD"];

const defaultVariantPalettes = {
  "personal-audio": [
    { label: "Pearl White", priceDelta: 0, imageIndex: 0 },
    { label: "Midnight Black", priceDelta: 300, imageIndex: 1 },
    { label: "Ocean Blue", priceDelta: 500, imageIndex: 2 }
  ],
  "professional-audio": [
    { label: "Carbon Black", priceDelta: 0, imageIndex: 0 },
    { label: "Studio Silver", priceDelta: 400, imageIndex: 1 },
    { label: "Copper Brown", priceDelta: 650, imageIndex: 2 }
  ],
  "digital-camera": [
    { label: "Graphite Black", priceDelta: 0, imageIndex: 0 },
    { label: "Crimson Red", priceDelta: 500, imageIndex: 1 },
    { label: "Arctic Silver", priceDelta: 800, imageIndex: 2 }
  ],
  "security-camera": [
    { label: "Matte White", priceDelta: 0, imageIndex: 0 },
    { label: "Slate Grey", priceDelta: 250, imageIndex: 1 },
    { label: "Carbon Black", priceDelta: 350, imageIndex: 2 }
  ],
  "digital-photo-frames": [
    { label: "Ivory White", priceDelta: 0, imageIndex: 0 },
    { label: "Walnut Brown", priceDelta: 500, imageIndex: 1 },
    { label: "Matte Black", priceDelta: 700, imageIndex: 2 }
  ],
  "reading-light": [
    { label: "Warm Grey", priceDelta: 0, imageIndex: 0 },
    { label: "Forest Green", priceDelta: 150, imageIndex: 1 },
    { label: "Midnight Blue", priceDelta: 220, imageIndex: 2 }
  ]
};

function slugifyVariantLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createAsinFromSlug(slug) {
  const normalized = String(slug || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash * 31) + normalized.charCodeAt(index)) % 2821109907456;
  }

  return `B0${hash.toString(36).toUpperCase().padStart(8, "0").slice(-8)}`;
}

function rotateGallery(gallery, startIndex) {
  if (!Array.isArray(gallery) || !gallery.length) return [];
  const safeIndex = ((startIndex % gallery.length) + gallery.length) % gallery.length;
  return gallery.slice(safeIndex).concat(gallery.slice(0, safeIndex));
}

function getGeneralColor(config) {
  const generalGroup = (config.specGroups || []).find((group) => /general/i.test(group.title));
  const colorItem = generalGroup?.items?.find((item) => /color/i.test(item[0]));
  return colorItem?.[1] || "Standard";
}

function buildVariants(config, isOutOfStock) {
  const palette = Array.isArray(config.variants) && config.variants.length
    ? config.variants
    : (defaultVariantPalettes[config.collectionSlug] || []);

  if (!palette.length) return [];

  const baseAvailableStock = isOutOfStock
    ? 0
    : (config.availableStock || Math.max(4, Math.round((config.reviewCount || 120) / 16)));
  const baseColor = getGeneralColor(config);

  return palette.map((variant, index) => {
    const gallery = Array.isArray(variant.gallery) && variant.gallery.length
      ? variant.gallery
      : rotateGallery(config.gallery || [config.image], variant.imageIndex ?? index);
    const image = variant.image || gallery[0] || config.image;
    const price = Number(variant.price ?? (config.price + Number(variant.priceDelta || 0)));
    const mrp = Number(variant.mrp ?? (config.mrp + Number(variant.priceDelta || 0)));
    const availableStock = Number(variant.availableStock ?? Math.max(0, baseAvailableStock - index));

    return {
      key: variant.key || slugifyVariantLabel(variant.label || `${baseColor} ${index + 1}`),
      label: variant.label || baseColor,
      image,
      gallery,
      price,
      mrp,
      availableStock,
      stockLabel: availableStock > 0 ? "In Stock" : "Out of Stock",
      stockTone: availableStock > 0 ? "in-stock" : "out-of-stock"
    };
  });
}

function createProduct(config) {
  const discount = Math.round(((config.mrp - config.price) / config.mrp) * 100);
  const isOutOfStock = config.availability === "out-of-stock";

  return {
    stockLabel: isOutOfStock ? "Out of Stock" : "In Stock",
    stockTone: isOutOfStock ? "out-of-stock" : "in-stock",
    stockNote: isOutOfStock ? "Currently unavailable. Please check back soon." : "Available for immediate dispatch",
    reviewCount: 120,
    video: "images/Store video.mp4",
    videoPoster: config.image,
    sku: `AVY-${config.slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}`,
    asin: config.asin || createAsinFromSlug(config.slug),
    deliveryText: "Estimated Delivery: 3-7 business days",
    dispatchText: "Dispatch: Within 24-48 hours",
    codText: "COD: Available for eligible locations",
    shippingText: "Shipping: Secure packaging with safe handling",
    taxText: "Inclusive of all taxes",
    warrantySummary: "",
    returnSummary: "Easy return on eligible orders",
    paymentOptions,
    variants: buildVariants(config, isOutOfStock),
    faqs: [
      {
        question: "Is Cash on Delivery available?",
        answer: "Cash on Delivery is available for eligible pin codes and supported products."
      },
      {
        question: "What is the delivery time?",
        answer: "Most orders are dispatched within 24 to 48 hours and delivered in 3 to 7 business days depending on location."
      },
      {
        question: "Is this product original?",
        answer: "Yes, Avyona lists trusted products with authenticity-focused sourcing and standard support information."
      },
      {
        question: "Does it come with warranty?",
        answer: "Yes, this product includes warranty support as mentioned in the warranty section."
      },
      {
        question: "What is included in the box?",
        answer: "The package includes the main product, charging or connection accessories where applicable, and a user manual."
      },
      {
        question: "Can I return the product?",
        answer: "Eligible orders can be returned according to the seller and platform return policy terms."
      }
    ],
    reviewSummary: {
      average: config.rating.toFixed(1),
      breakdown: [
        { label: "5 Star", value: 80 },
        { label: "4 Star", value: 12 },
        { label: "3 Star", value: 5 },
        { label: "2 Star", value: 2 },
        { label: "1 Star", value: 1 }
      ]
    },
    reviews: [
      {
        name: "Rahul M.",
        title: "Excellent product quality!",
        rating: 5,
        date: "March 2026",
        body: `Very happy with the purchase. Premium feel and works perfectly. Highly recommended.`
      },
      {
        name: "Priya S.",
        title: "Good value for money",
        rating: 4,
        date: "February 2026",
        body: `Nice product with good build quality. Delivery was quick and packaging was secure.`
      },
      {
        name: "Amit K.",
        title: "Perfect for gifting",
        rating: 5,
        date: "January 2026",
        body: `Bought this as a gift and it was loved. Great quality and easy to set up.`
      }
    ],
    ...config,
    discount
  };
}

const productData = {
  "sony-pulsefit-anc-earbuds": createProduct({
    slug: "sony-pulsefit-anc-earbuds",
    name: "Sony PulseFit ANC Earbuds",
    brand: "Sony",
    category: "Personal Audio",
    collectionSlug: "personal-audio",
    collectionPage: "personal-audio.html",
    price: 7499,
    mrp: 8999,
    rating: 4.8,
    reviewCount: 128,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Active noise cancellation for immersive listening",
      "Compact ergonomic fit for long daily comfort",
      "Clear mic performance for calls and meetings",
      "Pocket-friendly charging case for travel",
      "Fast pairing across everyday mobile devices"
    ],
    description: [
      "Sony PulseFit ANC Earbuds are designed for modern listening with a clean, compact profile and dependable everyday comfort. They combine rich sound with effective noise control, making them a strong fit for work, travel, and casual listening.",
      "With a lightweight case, balanced tuning, and easy pairing, these earbuds bring premium convenience to daily routines without adding clutter."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Sony"], ["Product Type", "Wireless Earbuds"], ["Model", "PulseFit ANC"], ["Color", "White"]] },
      { title: "Audio Features", items: [["Noise Cancellation", "Active"], ["Connectivity", "Bluetooth 5.3"], ["Battery Backup", "Up to 28 hours"], ["Microphones", "Dual mic calling"]] },
      { title: "In The Box", items: [["Contents", "Earbuds, charging case, cable, manual"]] },
      { title: "Warranty", items: [["Coverage", "1 Year"], ["Support", "Brand service support"]] }
    ]
  }),
  "akg-studio-reference-headphones": createProduct({
    slug: "akg-studio-reference-headphones",
    name: "AKG Studio Reference Headphones",
    brand: "AKG",
    availability: "out-of-stock",
    category: "Professional Audio",
    collectionSlug: "professional-audio",
    collectionPage: "professional-audio.html",
    price: 12999,
    mrp: 15499,
    rating: 4.7,
    reviewCount: 96,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Detailed sound tuning for mixing and editing",
      "Comfort-fit ear cushions for long sessions",
      "Clean mids and controlled low-end response",
      "Reliable wired connectivity for studio setups",
      "Ideal for creators, producers, and podcasters"
    ],
    description: [
      "AKG Studio Reference Headphones bring clear, balanced playback for creators who need more control while editing, mixing, and monitoring.",
      "The design stays comfortable through long sessions while preserving the neutral presentation expected from pro-focused audio gear."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "AKG"], ["Product Type", "Studio Headphones"], ["Fit", "Over-Ear"], ["Color", "Black"]] },
      { title: "Audio Features", items: [["Driver Size", "Large reference driver"], ["Connectivity", "Wired"], ["Use Case", "Studio monitoring"], ["Foldable", "Yes"]] },
      { title: "In The Box", items: [["Contents", "Headphones, cable, adapter, manual"]] },
      { title: "Warranty", items: [["Coverage", "1 Year"], ["Support", "Authorized service support"]] }
    ]
  }),
  "kodak-zoomlite-camera": createProduct({
    slug: "kodak-zoomlite-camera",
    name: "Kodak ZoomLite Camera",
    brand: "Kodak",
    category: "Digital Camera",
    collectionSlug: "digital-camera",
    collectionPage: "digital-camera.html",
    price: 18499,
    mrp: 20999,
    rating: 4.6,
    reviewCount: 84,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Travel-friendly camera with dependable imaging",
      "Simple controls for family and beginner use",
      "Sharp stills with easy everyday handling",
      "Lightweight body for carry-anywhere shooting",
      "Built for trips, events, and lifestyle moments"
    ],
    description: [
      "Kodak ZoomLite Camera is built for users who want a straightforward digital camera with trusted branding and reliable results.",
      "Its compact footprint and simple operation make it ideal for vacations, gifting, and everyday photography without a steep learning curve."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Kodak"], ["Product Type", "Digital Camera"], ["Model", "ZoomLite"], ["Color", "Black"]] },
      { title: "Camera Specs", items: [["Sensor", "High-resolution digital sensor"], ["Video", "Full HD"], ["Zoom", "Optical zoom support"], ["Display", "Rear preview display"]] },
      { title: "Connectivity", items: [["Ports", "USB"], ["Memory Support", "Expandable card support"]] },
      { title: "Warranty", items: [["Coverage", "1 Year"], ["Support", "Brand-backed service support"]] }
    ]
  }),
  "wyze-secure-view-cam": createProduct({
    slug: "wyze-secure-view-cam",
    name: "Wyze Secure View Cam",
    brand: "Wyze",
    availability: "out-of-stock",
    category: "Security Camera",
    collectionSlug: "security-camera",
    collectionPage: "security-camera.html",
    price: 4299,
    mrp: 5299,
    rating: 4.5,
    reviewCount: 74,
    image: "",
    gallery: [
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Reliable day and night home monitoring",
      "App alerts for faster visibility",
      "Two-way communication support",
      "Compact indoor-friendly design",
      "Simple setup for home security basics"
    ],
    description: [
      "Wyze Secure View Cam offers a clean, app-connected way to keep an eye on important spaces at home. It is built for quick setup, dependable alerts, and straightforward daily use.",
      "For families and small-space monitoring, it delivers the right mix of visibility, convenience, and trusted essential features."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Wyze"], ["Product Type", "Indoor Security Camera"], ["Model", "Secure View Cam"], ["Color", "White"]] },
      { title: "Security Features", items: [["Night Vision", "Yes"], ["Two-Way Audio", "Yes"], ["Motion Alerts", "App notifications"], ["Storage", "Cloud and local support"]] },
      { title: "Connectivity", items: [["WiFi", "Yes"], ["App Support", "Yes"]] },
      { title: "Warranty", items: [["Coverage", "1 Year"], ["Support", "Brand and seller support"]] }
    ]
  }),
  "avyona-aura-10-frame": createProduct({
    slug: "avyona-aura-10-frame",
    variantGroupId: "GRP1001",
    variantGroupName: "Avyona Aura Frame",
    variantType: "Size",
    variantValue: "10 Inch",
    name: "Avyona Aura 10 Frame",
    brand: "Avyona",
    category: "Avyona Digital Photo Frames",
    collectionSlug: "digital-photo-frames",
    collectionPage: "digital-photo-frames.html",
    price: 8999,
    mrp: 9999,
    rating: 4.9,
    reviewCount: 214,
    image: "",
    gallery: [
      "",
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "10.1-inch HD IPS touchscreen display",
      "Instant photo and video sharing via app",
      "32GB built-in storage for family memories",
      "Auto rotate for portrait and landscape view",
      "Elegant design for gifting and home display"
    ],
    description: [
      "Avyona Aura 10 Frame is designed to make everyday memories feel more alive, more visible, and easier to share. With a crisp touchscreen display and app-based transfers, it fits naturally into modern homes and thoughtful gifting moments.",
      "Its balanced size, clean design, and simple setup make it a standout option for desks, shelves, and family spaces where photos deserve more attention."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Digital Photo Frame"], ["Model", "Aura 10"], ["Color", "White"]] },
      { title: "Display", items: [["Screen Size", "10.1 inch"], ["Resolution", "HD IPS"], ["Touchscreen", "Yes"], ["Orientation", "Auto rotate"]] },
      { title: "Connectivity", items: [["WiFi", "Yes"], ["App Support", "Yes"], ["Storage", "32GB built-in"]] },
      { title: "In The Box", items: [["Contents", "Photo frame, adapter, manual"]] }
    ]
  }),
  "glocusent-focus-reading-light": createProduct({
    slug: "glocusent-focus-reading-light",
    name: "Glocusent Focus Reading Light",
    brand: "Glocusent",
    availability: "out-of-stock",
    category: "Reading Light",
    collectionSlug: "reading-light",
    collectionPage: "reading-light.html",
    price: 2499,
    mrp: 2999,
    rating: 4.7,
    reviewCount: 63,
    image: "",
    gallery: [
      "",
      ""
    ],
    highlights: [
      "Eye-friendly lighting for focused reading",
      "Adjustable brightness settings for comfort",
      "Portable design for bedside and travel use",
      "Flexible positioning for books and desks",
      "Ideal for late-night reading without strain"
    ],
    description: [
      "Glocusent Focus Reading Light is built to support longer reading sessions with softer, more practical lighting control. It works well for study corners, bed-side tables, and portable use.",
      "Its compact shape and easy adjustment make it a strong choice for readers who want comfort without bulky lighting accessories."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Glocusent"], ["Product Type", "Reading Light"], ["Model", "Focus"], ["Color", "Warm Grey"]] },
      { title: "Lighting", items: [["Brightness Modes", "Multiple"], ["Color Temperature", "Adjustable"], ["Charging", "USB"], ["Battery", "Rechargeable"]] },
      { title: "Use", items: [["Design", "Portable and flexible"], ["Best For", "Reading, work, travel"]] },
      { title: "Warranty", items: [["Coverage", "1 Year"]] }
    ]
  }),
  "jbl-flexsound-neckband": createProduct({
    slug: "jbl-flexsound-neckband",
    name: "JBL FlexSound Neckband",
    brand: "JBL",
    category: "Personal Audio",
    collectionSlug: "personal-audio",
    collectionPage: "personal-audio.html",
    price: 3299,
    mrp: 4299,
    rating: 4.6,
    reviewCount: 110,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Comfortable neckband fit for long use",
      "Reliable battery backup for commutes",
      "Clear call quality with easy controls",
      "Built for workouts and daily travel",
      "Balanced JBL sound tuning"
    ],
    description: [
      "JBL FlexSound Neckband is made for everyday convenience, giving you a secure fit with dependable wireless performance for calls, workouts, and music on the move.",
      "It keeps controls simple and comfort high, making it an easy pick for all-day use."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "JBL"], ["Product Type", "Wireless Neckband"], ["Color", "Black"]] },
      { title: "Audio Features", items: [["Connectivity", "Bluetooth"], ["Battery Backup", "Up to 20 hours"], ["Water Resistance", "Sweat resistant"]] },
      { title: "In The Box", items: [["Contents", "Neckband, charging cable, tips, manual"]] }
    ]
  }),
  "avyona-aura-15-frame": createProduct({
    slug: "avyona-aura-15-frame",
    variantGroupId: "GRP1001",
    variantGroupName: "Avyona Aura Frame",
    variantType: "Size",
    variantValue: "15 Inch",
    name: "Avyona Aura 15 Frame",
    brand: "Avyona",
    category: "Avyona Digital Photo Frames",
    collectionSlug: "digital-photo-frames",
    collectionPage: "digital-photo-frames.html",
    price: 12999,
    mrp: 14999,
    rating: 4.8,
    reviewCount: 156,
    image: "",
    gallery: [
      "",
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Large premium display for statement spaces",
      "Smart sharing support for family moments",
      "Elegant styling for modern interiors",
      "Auto rotate and simple touch controls",
      "Ideal for living rooms and gifting"
    ],
    description: [
      "Avyona Aura 15 Frame gives your best memories a larger canvas with a clean, premium presentation built for modern interiors.",
      "It is especially suited to shared spaces where photos become part of the room, not just a device on a shelf."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Model", "Aura 15"], ["Category", "Digital Photo Frame"]] },
      { title: "Display", items: [["Screen Size", "15 inch"], ["Resolution", "HD IPS"], ["Touchscreen", "Yes"], ["Orientation", "Auto rotate"]] },
      { title: "Connectivity", items: [["WiFi", "Yes"], ["Storage", "32GB"], ["App Sharing", "Yes"]] }
    ]
  }),
  "avyona-aura-8-frame": createProduct({
    slug: "avyona-aura-8-frame",
    variantGroupId: "GRP1001",
    variantGroupName: "Avyona Aura Frame",
    variantType: "Size",
    variantValue: "8 Inch",
    name: "Avyona Aura 8 Frame",
    brand: "Avyona",
    category: "Avyona Digital Photo Frames",
    collectionSlug: "digital-photo-frames",
    collectionPage: "digital-photo-frames.html",
    price: 6999,
    mrp: 7999,
    rating: 4.6,
    reviewCount: 88,
    image: "",
    gallery: [
      "",
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Compact gifting size for desks and side tables",
      "Simple setup with app-assisted sharing",
      "Elegant frame styling for modern homes",
      "Portrait and landscape support",
      "Great for birthdays and family gifting"
    ],
    description: [
      "Avyona Aura 8 Frame is a compact smart frame created for gifting, desks, and smaller personal spaces.",
      "It keeps setup simple while still delivering the connected sharing experience expected from the Aura lineup."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Model", "Aura 8"], ["Category", "Digital Photo Frame"]] },
      { title: "Display", items: [["Screen Size", "8 inch"], ["Resolution", "HD"], ["Orientation", "Auto rotate"]] }
    ]
  }),
  "avyona-aura-12-frame": createProduct({
    slug: "avyona-aura-12-frame",
    variantGroupId: "GRP1001",
    variantGroupName: "Avyona Aura Frame",
    variantType: "Size",
    variantValue: "12 Inch",
    name: "Avyona Aura 12 Frame",
    brand: "Avyona",
    category: "Avyona Digital Photo Frames",
    collectionSlug: "digital-photo-frames",
    collectionPage: "digital-photo-frames.html",
    price: 10499,
    mrp: 11999,
    rating: 4.7,
    reviewCount: 132,
    image: "",
    gallery: [
      "",
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Balanced display size for family spaces",
      "Smooth app-based sharing and updates",
      "Modern design with premium finish",
      "Touch controls and auto rotate support",
      "Fits both gifting and everyday home use"
    ],
    description: [
      "Avyona Aura 12 Frame offers a larger, more immersive display without feeling oversized in common home spaces.",
      "It is an ideal balance for customers who want a richer viewing area while keeping the frame easy to place."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Model", "Aura 12"], ["Category", "Digital Photo Frame"]] },
      { title: "Display", items: [["Screen Size", "12 inch"], ["Resolution", "HD IPS"], ["Touchscreen", "Yes"]] }
    ]
  }),
  "avyona-aura-gift-edition": createProduct({
    slug: "avyona-aura-gift-edition",
    name: "Avyona Aura Gift Edition",
    brand: "Avyona",
    category: "Avyona Digital Photo Frames",
    collectionSlug: "digital-photo-frames",
    collectionPage: "digital-photo-frames.html",
    price: 13999,
    mrp: 15999,
    rating: 4.8,
    reviewCount: 76,
    image: "",
    gallery: [
      "",
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Gift-ready presentation for special occasions",
      "Premium finish designed for memorable unboxing",
      "Smart sharing for family and loved ones",
      "Large internal storage for photo collections",
      "Ideal for anniversaries and celebrations"
    ],
    description: [
      "Avyona Aura Gift Edition is designed to make premium gifting feel more complete, from presentation to long-term everyday use.",
      "It combines connected sharing, elegant styling, and occasion-ready packaging for customers who want a stronger gifting moment."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Edition", "Gift Edition"], ["Category", "Digital Photo Frame"]] },
      { title: "Highlights", items: [["Packaging", "Gift-ready"], ["Storage", "32GB"], ["App Sharing", "Yes"]] }
    ]
  }),
  "sony-streammic-audio-kit": createProduct({
    slug: "sony-streammic-audio-kit",
    name: "Sony StreamMic Audio Kit",
    brand: "Sony",
    category: "Professional Audio",
    collectionSlug: "professional-audio",
    collectionPage: "professional-audio.html",
    price: 9599,
    mrp: 11299,
    rating: 4.6,
    reviewCount: 54,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Clean vocal pickup for creators",
      "Desktop-ready setup for streaming and calls",
      "Reliable clarity for podcast and studio use",
      "Compact format with creator-friendly design",
      "Simple connection for modern workstations"
    ],
    description: [
      "Sony StreamMic Audio Kit is designed for creators who need an easy path to clearer voice capture for streaming, meetings, and content recording.",
      "It offers a practical balance between performance, portability, and straightforward daily setup."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Sony"], ["Product Type", "Microphone Kit"], ["Use Case", "Streaming and voice capture"]] },
      { title: "Audio Features", items: [["Pickup", "Focused vocal capture"], ["Connection", "USB"], ["Mount", "Desktop ready"]] }
    ]
  }),
  "kodak-pocket-snap-camera": createProduct({
    slug: "kodak-pocket-snap-camera",
    name: "Kodak Pocket Snap Camera",
    brand: "Kodak",
    category: "Digital Camera",
    collectionSlug: "digital-camera",
    collectionPage: "digital-camera.html",
    price: 11499,
    mrp: 12999,
    rating: 4.5,
    reviewCount: 69,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Portable design for travel and gifting",
      "Simple controls for quick capture",
      "Lightweight body for day trips",
      "Reliable everyday image quality",
      "Ideal for casual photographers"
    ],
    description: [
      "Kodak Pocket Snap Camera is a portable digital camera built for people who value simplicity, size, and everyday fun.",
      "Its compact design makes it easy to carry without sacrificing the practical controls needed for quick capture."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Kodak"], ["Product Type", "Compact Camera"], ["Model", "Pocket Snap"]] },
      { title: "Camera Specs", items: [["Body", "Portable compact"], ["Video", "HD recording"], ["Storage", "Card support"]] }
    ]
  }),
  "glocusent-night-reader-pro": createProduct({
    slug: "glocusent-night-reader-pro",
    name: "Glocusent Night Reader Pro",
    brand: "Glocusent",
    category: "Reading Light",
    collectionSlug: "reading-light",
    collectionPage: "reading-light.html",
    price: 2899,
    mrp: 3499,
    rating: 4.6,
    reviewCount: 58,
    image: "",
    gallery: [
      "",
      ""
    ],
    highlights: [
      "Late-night friendly reading comfort",
      "Adjustable warmth and brightness control",
      "Portable design for home and travel",
      "Focused lighting with low glare feel",
      "Great for bedside reading routines"
    ],
    description: [
      "Glocusent Night Reader Pro is built for quieter reading sessions where softer, more controlled lighting matters.",
      "It offers a practical bedside solution for readers who want comfort, portability, and a more refined late-night setup."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Glocusent"], ["Product Type", "Reading Light"], ["Model", "Night Reader Pro"]] },
      { title: "Lighting", items: [["Brightness", "Multi-step"], ["Color Modes", "Adjustable"], ["Charging", "USB rechargeable"]] }
    ]
  }),
  "avyona-airbeat-pods": createProduct({
    slug: "avyona-airbeat-pods",
    name: "Avyona AirBeat Pods",
    brand: "Avyona",
    category: "Personal Audio",
    collectionSlug: "personal-audio",
    collectionPage: "personal-audio.html",
    price: 4599,
    mrp: 5599,
    rating: 4.5,
    reviewCount: 72,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Balanced sound with fast pairing",
      "Portable charging case for daily use",
      "Lightweight comfort-fit design",
      "Good battery support for commutes",
      "Clean Avyona styling"
    ],
    description: [
      "Avyona AirBeat Pods are designed as a clean everyday audio essential with a comfortable fit and fast wireless pairing.",
      "They offer a simple, accessible route into premium-feeling personal audio for calls, music, and on-the-go listening."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Wireless Earbuds"], ["Model", "AirBeat Pods"]] },
      { title: "Audio Features", items: [["Connectivity", "Bluetooth"], ["Battery", "Up to 24 hours with case"]] }
    ]
  }),
  "sony-quietwave-headphones": createProduct({
    slug: "sony-quietwave-headphones",
    name: "Sony QuietWave Headphones",
    brand: "Sony",
    category: "Personal Audio",
    collectionSlug: "personal-audio",
    collectionPage: "personal-audio.html",
    price: 10999,
    mrp: 12999,
    rating: 4.7,
    reviewCount: 104,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Rich bass and long battery life",
      "Comfortable over-ear design",
      "Reliable wireless listening performance",
      "Great for travel and work sessions",
      "Trusted Sony audio tuning"
    ],
    description: [
      "Sony QuietWave Headphones deliver a more immersive personal audio experience with strong comfort, reliable battery support, and fuller everyday sound.",
      "They fit especially well for users who want a single pair for work, travel, and relaxed listening."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Sony"], ["Product Type", "Wireless Headphones"], ["Fit", "Over-Ear"]] },
      { title: "Audio Features", items: [["Battery", "Up to 35 hours"], ["Connectivity", "Bluetooth"], ["Controls", "On-ear buttons"]] }
    ]
  }),
  "avyona-deskaudio-monitor": createProduct({
    slug: "avyona-deskaudio-monitor",
    name: "Avyona DeskAudio Monitor",
    brand: "Avyona",
    category: "Professional Audio",
    collectionSlug: "professional-audio",
    collectionPage: "professional-audio.html",
    price: 14999,
    mrp: 17699,
    rating: 4.5,
    reviewCount: 39,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Compact desktop monitoring setup",
      "Designed for creator workspaces",
      "Balanced output for editing and playback",
      "Clean styling for premium desk setups",
      "Ideal for content and studio-lite environments"
    ],
    description: [
      "Avyona DeskAudio Monitor is tuned for creators who want more confidence in desktop playback without building a full studio room.",
      "It offers a cleaner listening reference for editing, reviewing, and focused content work."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Desktop Audio Monitor"], ["Use Case", "Creator workspace"]] },
      { title: "Audio Features", items: [["Output", "Balanced desktop playback"], ["Connectivity", "Wired inputs"], ["Placement", "Desk-ready"]] }
    ]
  }),
  "avyona-capturepro-x": createProduct({
    slug: "avyona-capturepro-x",
    name: "Avyona CapturePro X",
    brand: "Avyona",
    category: "Digital Camera",
    collectionSlug: "digital-camera",
    collectionPage: "digital-camera.html",
    price: 22999,
    mrp: 25999,
    rating: 4.7,
    reviewCount: 46,
    image: "",
    gallery: [
      "",
      "",
      ""
    ],
    highlights: [
      "Versatile camera for creators and families",
      "Sharp image performance in a clean body",
      "Modern controls with straightforward learning curve",
      "Suitable for photos and travel content",
      "Premium Avyona styling"
    ],
    description: [
      "Avyona CapturePro X is positioned for customers who want a more premium digital camera option for family moments, creator use, and travel capture.",
      "It balances capability and approachability so users can move beyond a basic compact camera without feeling overwhelmed."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Digital Camera"], ["Model", "CapturePro X"]] },
      { title: "Camera Specs", items: [["Sensor", "High-detail image sensor"], ["Video", "4K supported"], ["Display", "Rear display"]] }
    ]
  }),
  "avyona-guardcam-mini": createProduct({
    slug: "avyona-guardcam-mini",
    name: "Avyona GuardCam Mini",
    brand: "Avyona",
    category: "Security Camera",
    collectionSlug: "security-camera",
    collectionPage: "security-camera.html",
    price: 3899,
    mrp: 4599,
    rating: 4.4,
    reviewCount: 42,
    image: "",
    gallery: [
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Compact indoor security coverage",
      "Two-way communication support",
      "Quick setup for home monitoring",
      "Smart app control for visibility",
      "Space-saving design for shelves and corners"
    ],
    description: [
      "Avyona GuardCam Mini is built for compact home monitoring where simple placement and fast access matter most.",
      "It fits naturally into smaller rooms and delivers essential visibility with easy app support."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Indoor Security Camera"], ["Model", "GuardCam Mini"]] },
      { title: "Security Features", items: [["Night Vision", "Yes"], ["Two-Way Audio", "Yes"], ["Motion Alerts", "Yes"]] }
    ]
  }),
  "wyze-outdoor-shield-pro": createProduct({
    slug: "wyze-outdoor-shield-pro",
    name: "Wyze Outdoor Shield Pro",
    brand: "Wyze",
    category: "Security Camera",
    collectionSlug: "security-camera",
    collectionPage: "security-camera.html",
    price: 6899,
    mrp: 7999,
    rating: 4.6,
    reviewCount: 51,
    image: "",
    gallery: [
      "",
      "",
      "",
      ""
    ],
    highlights: [
      "Weather-ready design for outdoor monitoring",
      "Reliable alerts for entrances and perimeters",
      "App access with clear visibility controls",
      "Built for home exterior coverage",
      "Dependable day and night performance"
    ],
    description: [
      "Wyze Outdoor Shield Pro extends home monitoring to exterior spaces with a more durable, weather-ready setup.",
      "It works well for entrances, gates, and perimeter zones where consistent outdoor visibility is important."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Wyze"], ["Product Type", "Outdoor Security Camera"], ["Model", "Shield Pro"]] },
      { title: "Security Features", items: [["Weather Resistance", "Yes"], ["Night Vision", "Yes"], ["Motion Alerts", "Smart app alerts"]] }
    ]
  }),
  "avyona-glowclip-light": createProduct({
    slug: "avyona-glowclip-light",
    name: "Avyona GlowClip Light",
    brand: "Avyona",
    category: "Reading Light",
    collectionSlug: "reading-light",
    collectionPage: "reading-light.html",
    price: 1999,
    mrp: 2499,
    rating: 4.4,
    reviewCount: 44,
    image: "",
    gallery: [
      "",
      ""
    ],
    highlights: [
      "Clip-on convenience for desks and books",
      "Portable and easy to position",
      "Comfortable lighting for reading and study",
      "Compact travel-friendly format",
      "Simple Avyona everyday utility"
    ],
    description: [
      "Avyona GlowClip Light is made for practical everyday reading, giving users a simple clip-on design for desks, books, and travel kits.",
      "It is especially useful when flexible positioning matters more than a full desk lamp setup."
    ],
    specGroups: [
      { title: "General Information", items: [["Brand", "Avyona"], ["Product Type", "Clip Reading Light"], ["Model", "GlowClip"]] },
      { title: "Lighting", items: [["Brightness Modes", "Adjustable"], ["Charging", "USB"], ["Design", "Clip-on portable"]] }
    ]
  })
};

export { productData };
