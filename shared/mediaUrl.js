/**
 * Resolve catalog and settings media for display.
 * Store relative paths (/uploads/..., /images/...) in the database; admin can change them anytime.
 */
export function getApiMediaOrigin(apiBaseUrl = "") {
  return String(apiBaseUrl || "")
    .replace(/\/api\/v\d+\/?$/i, "")
    .replace(/\/$/, "");
}

export function stripApiMediaOrigin(value, apiOrigin = "") {
  const url = String(value || "").trim();
  if (!url || !apiOrigin) return url;
  const origin = getApiMediaOrigin(apiOrigin);
  if (origin && url.startsWith(origin)) {
    const relative = url.slice(origin.length);
    return relative.startsWith("/") ? relative : `/${relative}`;
  }
  return url;
}

export function isApiHostedMediaPath(value) {
  const url = String(value || "").trim();
  return url.startsWith("/uploads/") || url.startsWith("/images/");
}

/**
 * @param {string} value - DB or settings value
 * @param {string} apiOrigin - API host without /api/v1 (e.g. https://api.example.com)
 * @param {string} [fallback=""]
 */
export function resolveMediaUrl(value, apiOrigin = "", fallback = "") {
  const url = String(value || "").trim();
  if (!url) return fallback;
  if (/^(data|blob):/i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = getApiMediaOrigin(apiOrigin);
  if (isApiHostedMediaPath(url)) {
    return origin ? `${origin}${url}` : url;
  }
  return url.startsWith("/") ? url : `/${url}`;
}

export function resolveMediaUrlList(values, apiOrigin = "") {
  const list = Array.isArray(values) ? values : [];
  return [...new Set(list.map((entry) => resolveMediaUrl(entry, apiOrigin)).filter(Boolean))];
}

/** Prefer storing this in settings/DB after admin upload. */
export function toStoredMediaPath(value, apiOrigin = "") {
  const url = stripApiMediaOrigin(String(value || "").trim(), apiOrigin);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}
