const categoryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchCategoryTree() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  const url = `${apiBaseUrl}/categories/tree`;
  const cached = categoryCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Unable to fetch category tree");
  }

  const data = await response.json();
  categoryCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
