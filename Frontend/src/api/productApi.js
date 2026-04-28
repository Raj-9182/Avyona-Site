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
