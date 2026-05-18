const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

export async function submitContactEnquiry(payload) {
  const response = await fetch(`${API_BASE_URL}/contact-enquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Unable to submit contact enquiry");
  }

  return response.json();
}
