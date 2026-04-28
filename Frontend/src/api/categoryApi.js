export async function fetchCategoryTree() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  const response = await fetch(`${apiBaseUrl}/categories/tree`);

  if (!response.ok) {
    throw new Error("Unable to fetch category tree");
  }

  return response.json();
}
