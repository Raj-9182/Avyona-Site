const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const couponCache = new Map();
const CACHE_TTL_MS = 60_000;

export async function fetchStorefrontCoupons(params = {}) {
  const searchParams = new URLSearchParams(params);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const url = `${API_BASE_URL}/coupons${suffix}`;
  const cached = couponCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to fetch coupons");
  }

  const data = await response.json();
  couponCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
