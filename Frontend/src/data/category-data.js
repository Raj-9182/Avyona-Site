const fallbackCategories = [
  {
    id: 1,
    name: "Personal Audio",
    slug: "personal-audio",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Explore premium earbuds, headphones, and neckbands designed for music, travel, workouts, and everyday listening.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: true,
    categoryDiscountLabel: "Up to 15% Off",
    dynamicRuleJson: { matchCollectionSlug: "personal-audio" },
    sortOrder: 1,
    childCount: 2,
    metaTitle: "Personal Audio Collection | Avyona",
    metaDescription: "Shop personal audio products including headphones, earbuds, and neckbands.",
    keywords: "personal audio, headphones, earbuds, neckbands",
    productSlugs: [
      "sony-pulsefit-anc-earbuds",
      "jbl-flexsound-neckband",
      "avyona-airbeat-pods",
      "sony-quietwave-headphones"
    ]
  },
  {
    id: 11,
    name: "Earbuds",
    slug: "earbuds",
    parentId: 1,
    parentCategory: "Personal Audio",
    categoryType: "subcategory",
    description: "Wireless earbuds and compact listening picks under Personal Audio.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: false,
    categoryDiscountLabel: null,
    dynamicRuleJson: { productSlugs: ["sony-pulsefit-anc-earbuds", "avyona-airbeat-pods"] },
    sortOrder: 11,
    childCount: 0,
    metaTitle: "Earbuds Collection | Avyona",
    metaDescription: "Browse earbuds under the Personal Audio collection.",
    keywords: "earbuds, wireless earbuds, personal audio",
    productSlugs: ["sony-pulsefit-anc-earbuds", "avyona-airbeat-pods"]
  },
  {
    id: 12,
    name: "Headphones",
    slug: "headphones",
    parentId: 1,
    parentCategory: "Personal Audio",
    categoryType: "subcategory",
    description: "Over-ear and on-ear headphones under Personal Audio.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: false,
    featuredCategory: false,
    categoryDiscountLabel: null,
    dynamicRuleJson: { productSlugs: ["sony-quietwave-headphones", "jbl-flexsound-neckband"] },
    sortOrder: 12,
    childCount: 0,
    metaTitle: "Headphones Collection | Avyona",
    metaDescription: "Browse headphones under the Personal Audio collection.",
    keywords: "headphones, wireless headphones, personal audio",
    productSlugs: ["sony-quietwave-headphones", "jbl-flexsound-neckband"]
  },
  {
    id: 2,
    name: "Professional Audio",
    slug: "professional-audio",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Creator-ready headphones, microphones, and reference gear for studio setups, podcasting, and professional-grade sound clarity.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: true,
    categoryDiscountLabel: "Studio Picks",
    dynamicRuleJson: { matchCollectionSlug: "professional-audio" },
    sortOrder: 2,
    childCount: 0,
    metaTitle: "Professional Audio Collection | Avyona",
    metaDescription: "Discover microphones, monitors, and creator-focused professional audio gear.",
    keywords: "professional audio, studio audio, creator gear",
    productSlugs: ["akg-studio-reference-headphones", "sony-streammic-audio-kit", "avyona-deskaudio-monitor"]
  },
  {
    id: 3,
    name: "Digital Camera",
    slug: "digital-camera",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Capture travel, family, and creator moments with trusted digital cameras built for sharp imaging and simple operation.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: true,
    categoryDiscountLabel: "Creator Deals",
    dynamicRuleJson: { matchCollectionSlug: "digital-camera" },
    sortOrder: 3,
    childCount: 1,
    metaTitle: "Digital Camera Collection | Avyona",
    metaDescription: "Browse digital cameras for travel, family, and creator use.",
    keywords: "digital camera, compact camera, creator camera",
    productSlugs: ["kodak-zoomlite-camera", "kodak-pocket-snap-camera", "avyona-capturepro-x"]
  },
  {
    id: 31,
    name: "DSLR Cameras",
    slug: "dslr-cameras",
    parentId: 3,
    parentCategory: "Digital Camera",
    categoryType: "subcategory",
    description: "DSLR and creator-focused cameras under Digital Camera.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: false,
    featuredCategory: false,
    categoryDiscountLabel: null,
    dynamicRuleJson: { productSlugs: ["avyona-capturepro-x", "kodak-zoomlite-camera"] },
    sortOrder: 31,
    childCount: 0,
    metaTitle: "DSLR Cameras Collection | Avyona",
    metaDescription: "Explore DSLR camera options under the Digital Camera collection.",
    keywords: "dslr cameras, digital camera, photography",
    productSlugs: ["avyona-capturepro-x", "kodak-zoomlite-camera"]
  },
  {
    id: 4,
    name: "Security Camera",
    slug: "security-camera",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Reliable indoor and outdoor monitoring products with app access, alerts, and smarter home visibility.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: false,
    categoryDiscountLabel: null,
    dynamicRuleJson: { matchCollectionSlug: "security-camera" },
    sortOrder: 4,
    childCount: 0,
    metaTitle: "Security Camera Collection | Avyona",
    metaDescription: "Explore indoor and outdoor security camera collections.",
    keywords: "security camera, smart camera, surveillance",
    productSlugs: ["wyze-secure-view-cam", "avyona-guardcam-mini", "wyze-outdoor-shield-pro"]
  },
  {
    id: 5,
    name: "Digital Photo Frames",
    slug: "digital-photo-frames",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Premium digital photo frames for sharing memories, gifting loved ones, and turning every room into a living gallery.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: true,
    categoryDiscountLabel: "Family Favorites",
    dynamicRuleJson: { matchCollectionSlug: "digital-photo-frames" },
    sortOrder: 5,
    childCount: 0,
    metaTitle: "Digital Photo Frames Collection | Avyona",
    metaDescription: "Shop digital photo frames for gifting, family sharing, and home display.",
    keywords: "digital photo frame, smart frame, gifting frame",
    productSlugs: [
      "avyona-aura-8-frame",
      "avyona-aura-10-frame",
      "avyona-aura-12-frame",
      "avyona-aura-15-frame",
      "avyona-aura-gift-edition"
    ]
  },
  {
    id: 6,
    name: "Reading Light",
    slug: "reading-light",
    parentId: null,
    parentCategory: null,
    categoryType: "main_category",
    description: "Comfort-focused reading lights for study corners, bedside use, travel, and long hours of relaxed reading.",
    imageUrl: "",
    bannerImageUrl: "",
    iconUrl: "",
    status: "active",
    showInMenu: true,
    featuredCategory: false,
    categoryDiscountLabel: null,
    dynamicRuleJson: { matchCollectionSlug: "reading-light" },
    sortOrder: 6,
    childCount: 0,
    metaTitle: "Reading Light Collection | Avyona",
    metaDescription: "Find clip-on and bedside reading lights for everyday use.",
    keywords: "reading light, bedside lamp, clip light",
    productSlugs: ["glocusent-focus-reading-light", "glocusent-night-reader-pro", "avyona-glowclip-light"]
  }
];

export function buildCategoryTree(categories) {
  const byId = new Map();
  const roots = [];

  categories.forEach((category) => {
    byId.set(category.id, { ...category, children: [] });
  });

  categories.forEach((category) => {
    const current = byId.get(category.id);

    if (category.parentId && byId.has(category.parentId)) {
      byId.get(category.parentId).children.push(current);
      return;
    }

    roots.push(current);
  });

  return roots;
}

export function flattenCategoryTree(categories) {
  const output = [];

  function walk(items) {
    items.forEach((item) => {
      output.push(item);
      if (Array.isArray(item.children) && item.children.length) {
        walk(item.children);
      }
    });
  }

  walk(categories);
  return output;
}

export function getFallbackCategoryTree() {
  return buildCategoryTree(fallbackCategories);
}

export const fallbackCategoryTree = getFallbackCategoryTree();
