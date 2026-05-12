const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export async function fetchStorefrontProducts(params = {}) {
  const searchParams = new URLSearchParams(params);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/products${suffix}`);

  if (!response.ok) {
    throw new Error("Unable to fetch products");
  }

  return response.json();
}

export async function fetchStorefrontProduct(productId) {
  const response = await fetch(`${API_BASE_URL}/products/${encodeURIComponent(productId)}`);

  if (!response.ok) {
    throw new Error("Unable to fetch product");
  }

  return response.json();
}

export async function fetchStorefrontProductReviews(productId, token = "", params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/reviews/product/${encodeURIComponent(productId)}${suffix}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error("Unable to fetch product reviews");
  }

  return response.json();
}

export async function fetchProductReviewSummary(productId) {
  const response = await fetch(`${API_BASE_URL}/reviews/product/${encodeURIComponent(productId)}/summary`);

  if (!response.ok) {
    throw new Error("Unable to fetch product review summary");
  }

  return response.json();
}

export async function fetchProductReviewMediaGallery(productId, token = "") {
  const response = await fetch(`${API_BASE_URL}/reviews/product/${encodeURIComponent(productId)}/media`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    throw new Error("Unable to fetch product review media");
  }

  return response.json();
}

export async function submitGuestReview(payload) {
  const response = await fetch(`${API_BASE_URL}/reviews/guest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Unable to submit guest review");
  }

  return response.json();
}
