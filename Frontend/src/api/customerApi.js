const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const CUSTOMER_TOKEN_KEY = "avyonaCustomerToken";

export function getCustomerToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(CUSTOMER_TOKEN_KEY) || "";
}

export function setCustomerToken(token) {
  if (typeof window === "undefined") return;
  if (!token) {
    window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearCustomerToken() {
  setCustomerToken("");
}

async function customerRequest(path, options = {}) {
  const token = getCustomerToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Customer request failed");
  }

  return response.json();
}

export async function signupCustomer(payload) {
  const response = await customerRequest("/customer/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (response.data?.token) setCustomerToken(response.data.token);
  return response;
}

export async function loginCustomer(payload) {
  const response = await customerRequest("/customer/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (response.data?.token) setCustomerToken(response.data.token);
  return response;
}

export function fetchCurrentCustomer() {
  return customerRequest("/customer/auth/me");
}

export function fetchCustomerCart() {
  return customerRequest("/customer/cart");
}

export function syncCustomerCart(items) {
  return customerRequest("/customer/cart", {
    method: "PUT",
    body: JSON.stringify({ items })
  });
}

export function fetchCustomerWishlist() {
  return customerRequest("/customer/wishlist");
}

export function syncCustomerWishlist(items) {
  return customerRequest("/customer/wishlist", {
    method: "PUT",
    body: JSON.stringify({ items })
  });
}

export function fetchCustomerOrders() {
  return customerRequest("/customer/orders");
}

export function fetchMyReviews() {
  return customerRequest("/customer/reviews");
}

export function submitCustomerReview(payload) {
  return customerRequest("/customer/reviews", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function uploadCustomerReviewMedia(file) {
  const token = getCustomerToken();
  const formData = new FormData();
  formData.append("media", file);

  const response = await fetch(`${API_BASE_URL}/customer/reviews/media`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Unable to upload review media");
  }

  return response.json();
}
