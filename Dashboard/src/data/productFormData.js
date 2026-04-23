function createEmptyVariant() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    variantType: "Color",
    variantValue: "",
    variantPrice: "",
    variantSku: "",
    variantStock: "",
    variantImage: null
  };
}

function createEmptySpecItem() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    label: "",
    value: ""
  };
}

function createEmptySpecGroup() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: "",
    items: [createEmptySpecItem()]
  };
}

function createPolicyItem(title = "") {
  return {
    id: `${Date.now()}-${Math.random()}`,
    title,
    content: ""
  };
}

function createEmptyFaqItem() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    question: "",
    answer: ""
  };
}

export function createInitialProductData() {
  return {
    basicInfo: {
      productName: "",
      brand: "",
      category: "",
      subcategory: "",
      slug: "",
      sku: "",
      productType: "",
      status: "draft",
      featured: false
    },
    pricingInventory: {
      sellingPrice: "",
      mrp: "",
      taxIncluded: true,
      stockQuantity: "",
      lowStockThreshold: "5",
      stockStatus: "in-stock",
      availabilityMessage: ""
    },
    media: {
      images: [],
      videos: []
    },
    variants: [createEmptyVariant()],
    highlights: ["", "", "", "", ""],
    description: {
      content: ""
    },
    specifications: [createEmptySpecGroup()],
    policies: {
      deliveryEstimate: "",
      dispatchTime: "",
      items: [
        createPolicyItem("Shipping Information"),
        createPolicyItem("Return & Refund"),
        createPolicyItem("Warranty Support"),
        createPolicyItem("COD Information")
      ]
    },
    faqs: [createEmptyFaqItem()],
    relatedProducts: {
      selectorMode: "auto-and-manual",
      autoByCategory: true,
      searchTerm: "",
      manualSelections: []
    },
    seo: {
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonicalUrl: "",
      ogImage: null
    }
  };
}

export {
  createEmptyFaqItem as createFaqItem,
  createEmptySpecGroup,
  createEmptySpecItem,
  createEmptyVariant,
  createPolicyItem
};
