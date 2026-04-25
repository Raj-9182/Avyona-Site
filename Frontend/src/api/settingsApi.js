export async function fetchPublicSettings() {
  const response = await fetch("http://localhost:4000/api/v1/settings/public");

  if (!response.ok) {
    throw new Error("Unable to fetch public settings");
  }

  return response.json();
}
