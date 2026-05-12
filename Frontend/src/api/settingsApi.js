export async function fetchPublicSettings() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  const response = await fetch(`${apiBaseUrl}/settings/public`);

  if (!response.ok) {
    throw new Error("Unable to fetch public settings");
  }

  return response.json();
}

export async function fetchPublicBrowseCategoriesSettings() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
  const response = await fetch(`${apiBaseUrl}/settings/public/homepage/browse-categories`);

  if (!response.ok) {
    throw new Error("Unable to fetch Browse Categories settings");
  }

  return response.json();
}
