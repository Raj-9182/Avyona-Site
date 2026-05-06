const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const CUSTOMER_TOKEN_KEY = "avyonaCustomerToken";
const ANALYTICS_SESSION_KEY = "avyonaAnalyticsSessionId";
const FREQUENT_EVENTS = new Set(["search", "filter_applied"]);
const DEBOUNCE_MS = 450;
const EVENT_ALIASES = {
  search_query: "search"
};

const debounceTimers = new Map();

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;

  const sessionId = `avy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(ANALYTICS_SESSION_KEY, sessionId);
  return sessionId;
}

function getDebounceKey(payload, eventType) {
  return [
    eventType,
    payload.query || "",
    payload.productId || payload.productSlug || payload.slug || "",
    payload.categoryId || payload.categorySlug || "",
    payload.metadata?.surface || ""
  ].join(":");
}

function sendAnalyticsEvent(payload) {
  if (typeof window === "undefined") return Promise.resolve();

  const token = window.localStorage.getItem(CUSTOMER_TOKEN_KEY) || "";
  const eventType = EVENT_ALIASES[payload.eventType] || payload.eventType;
  const eventId = payload.eventId || (
    window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  return fetch(`${API_BASE_URL}/analytics/event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      ...payload,
      eventId,
      eventType,
      sessionId: payload.sessionId || getAnalyticsSessionId()
    }),
    keepalive: true
  }).catch(() => {});
}

export function trackAnalyticsEvent(payload) {
  if (typeof window === "undefined") return Promise.resolve();

  const eventType = EVENT_ALIASES[payload.eventType] || payload.eventType;
  if (!FREQUENT_EVENTS.has(eventType)) {
    return sendAnalyticsEvent({ ...payload, eventType });
  }

  const debounceKey = getDebounceKey(payload, eventType);
  if (debounceTimers.has(debounceKey)) {
    window.clearTimeout(debounceTimers.get(debounceKey));
  }

  debounceTimers.set(debounceKey, window.setTimeout(() => {
    debounceTimers.delete(debounceKey);
    sendAnalyticsEvent({ ...payload, eventType });
  }, DEBOUNCE_MS));

  return Promise.resolve();
}
