export async function fetchCategoryTree() {
  const response = await fetch("http://localhost:4000/api/v1/categories/tree");

  if (!response.ok) {
    throw new Error("Unable to fetch category tree");
  }

  return response.json();
}
