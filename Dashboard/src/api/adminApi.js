import axios from "axios";

const ADMIN_TOKEN_KEY = "avyonaAdminToken";

export function getAdminToken() {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

export function setAdminToken(token) {
  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1"
});

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function bootstrapAdmin(payload) {
  return adminApi.post("/admin/auth/bootstrap", payload);
}

export async function loginAdmin(payload) {
  const response = await adminApi.post("/admin/auth/login", payload);
  const token = response.data?.data?.token || "";

  if (token) {
    setAdminToken(token);
  }

  return response;
}

export function fetchCurrentAdmin() {
  return adminApi.get("/admin/auth/me");
}

export function fetchBackendHealth() {
  return adminApi.get("/health");
}

export function fetchDashboardSummary() {
  return adminApi.get("/dashboard/summary");
}

export function fetchAdminSettings() {
  return adminApi.get("/settings");
}

export function updateAdminSettings(payload) {
  return adminApi.put("/settings", payload);
}

export function fetchProducts(params) {
  return adminApi.get("/products", { params });
}

export function createProduct(payload) {
  return adminApi.post("/products", payload);
}

export function updateProduct(productId, payload) {
  return adminApi.patch(`/products/${productId}`, payload);
}

export function fetchCategories() {
  return adminApi.get("/categories");
}

export function fetchCategory(categoryId) {
  return adminApi.get(`/categories/${categoryId}`);
}

export function createCategory(payload) {
  return adminApi.post("/categories", payload);
}

export function updateCategory(categoryId, payload) {
  return adminApi.put(`/categories/${categoryId}`, payload);
}

export function deleteCategory(categoryId) {
  return adminApi.delete(`/categories/${categoryId}`);
}

export function fetchOrders() {
  return adminApi.get("/orders");
}

export function updateOrderTracking(orderId, payload) {
  return adminApi.patch(`/orders/${orderId}/status`, payload);
}

export function fetchVariantGroups() {
  return adminApi.get("/variant-groups");
}

export function createVariantGroup(payload) {
  return adminApi.post("/variant-groups", payload);
}

export function uploadAdminImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  return adminApi.post("/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}

export function fetchWebsiteImages() {
  return adminApi.get("/uploads/images");
}

export function updateWebsiteImage(payload) {
  return adminApi.patch("/uploads/images", payload);
}

export function deleteWebsiteImage(url) {
  return adminApi.delete("/uploads/images", { data: { url } });
}

export function uploadAdminMedia(file) {
  const formData = new FormData();
  formData.append("media", file);

  return adminApi.post("/uploads/media", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
}
