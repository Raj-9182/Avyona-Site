const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export async function fetchPageSeo(path) {
  const searchParams = new URLSearchParams({ path });
  const response = await fetch(`${API_BASE_URL}/seo/page?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Unable to fetch page SEO");
  }

  return response.json();
}
