import {
  getApiMediaOrigin,
  resolveMediaUrl,
  resolveMediaUrlList
} from "../../../shared/mediaUrl.js";

export const API_MEDIA_ORIGIN = getApiMediaOrigin(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1"
);

export function resolveStorefrontMediaUrl(value, fallback = "") {
  return resolveMediaUrl(value, API_MEDIA_ORIGIN, fallback);
}

export function resolveStorefrontMediaUrlList(values) {
  return resolveMediaUrlList(values, API_MEDIA_ORIGIN);
}
