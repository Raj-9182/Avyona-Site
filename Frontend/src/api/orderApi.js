const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const CUSTOMER_TOKEN_KEY = "avyonaCustomerToken";

export async function createStorefrontOrder(payload) {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(CUSTOMER_TOKEN_KEY) : "";
  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Unable to create order");
  }

  return response.json();
}
