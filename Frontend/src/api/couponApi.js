const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export async function fetchStorefrontCoupons(params = {}) {
  const searchParams = new URLSearchParams(params);
  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/coupons${suffix}`);

  if (!response.ok) {
    throw new Error("Unable to fetch coupons");
  }

  return response.json();
}
